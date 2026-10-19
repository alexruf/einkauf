// Sends pending changes to the server and keeps the stored snapshot up to
// date. Takes the PocketBase client and the stores as parameters, so it can be
// tested with fakes.

const ITEM_FIELDS = 'id,text,checked,checkedAt,created,createdBy,updatedBy,claimedBy,claimedAt';

// How a failed request affects the rest of the outbox.
function classify(op, error) {
  const status = error?.status ?? 0;
  // The SDK reports network failures and aborted requests as status 0.
  if (status === 0) return 'offline';
  if (status === 401 || status === 403) return 'auth';
  // Too many requests or a server problem: the change itself is fine, so keep
  // it and try again on the next trigger.
  if (status === 429 || status >= 500) return 'retry';
  if (status === 404 && (op.type === 'setChecked' || op.type === 'setText' || op.type === 'setClaimed'))
    return 'deleted';
  // The item is gone, which is what the delete was for: the first attempt
  // arrived with its response lost, or someone else deleted it.
  if (status === 404 && op.type === 'delete') return 'done';
  if (status === 400 && op.type === 'create') return 'maybe-duplicate';
  return 'rejected';
}

const pickItem = (record) => Object.fromEntries(ITEM_FIELDS.split(',').map((f) => [f, record[f]]));

// Returns the snapshot with one realtime event ({ action, record }) applied.
function withEvent(snapshot, { action, record }) {
  const others = snapshot.items.filter((item) => item.id !== record.id);
  return { ...snapshot, items: action === 'delete' ? others : [...others, pickItem(record)] };
}

export function createSync({
  pb,
  store,
  outbox,
  onChange = () => {},
  onOffline = () => {},
  onAuthError = () => {},
  onRejected = () => {},
  // Purchases only feed the suggestions, so they do not redraw the list.
  onPurchases = () => {},
  now = () => new Date().toISOString(),
}) {
  const items = () => pb.collection('items');

  async function send(op) {
    if (op.type === 'create') {
      await items().create({ id: op.id, text: op.text });
    } else if (op.type === 'setChecked') {
      await items().update(op.id, { checked: op.checked });
    } else if (op.type === 'setText') {
      await items().update(op.id, { text: op.text });
    } else if (op.type === 'setClaimed') {
      // The server records whoever sends the claim; the own id only says
      // "claimed", an empty value says "released".
      await items().update(op.id, { claimedBy: op.claimed ? pb.authStore.record.id : '' });
    } else if (op.type === 'delete') {
      await items().delete(op.id);
    } else {
      throw new Error(`Unknown outbox operation: ${JSON.stringify(op)}`);
    }
  }

  // A retried create fails when the first attempt reached the server but its
  // response was lost. If the record exists, the create is done.
  async function existsOnServer(id) {
    try {
      await items().getOne(id, { fields: 'id' });
      return true;
    } catch (error) {
      if (error?.status === 404) return false;
      throw error;
    }
  }

  // Returns 'done', 'offline', 'auth' or 'retry'.
  async function sendAll() {
    for (const op of outbox.list()) {
      try {
        await send(op);
        outbox.remove(op);
      } catch (error) {
        let outcome = classify(op, error);
        if (outcome === 'maybe-duplicate') {
          try {
            outcome = (await existsOnServer(op.id)) ? 'done' : 'rejected';
          } catch (lookupError) {
            outcome = classify(op, lookupError);
          }
        }
        if (outcome === 'offline' || outcome === 'auth' || outcome === 'retry') return outcome;
        if (outcome === 'rejected') {
          console.error('Server rejected a pending change; dropping it', op, error);
          onRejected(op, error);
        }
        // 'done', 'deleted' and 'rejected' all leave the outbox.
        outbox.remove(op);
        onChange();
      }
    }
    return 'done';
  }

  // Remembers that the list is current as of now. Besides after a reload,
  // the app calls this when it stops being online, because realtime events
  // kept the list current until then.
  function markSynced() {
    store.set('lastSync', now());
  }

  // Realtime events received while a reload is running. The reload's result
  // may predate them, so they are applied again on top of it.
  let eventsDuringReload = null;

  // Loads the whole list and the family's names. The list is small, so this
  // is simpler than tracking changes and also covers events missed offline.
  // The purchases behind the suggestions load separately afterwards, so they
  // never hold up or break the list.
  async function reload() {
    eventsDuringReload = [];
    try {
      const [itemRecords, users] = await Promise.all([
        items().getFullList({ sort: 'created', fields: ITEM_FIELDS }),
        pb.collection('users').getFullList({ fields: 'id,name' }),
      ]);
      let snapshot = {
        items: itemRecords.map(pickItem),
        users: users.map(({ id, name }) => ({ id, name })),
        purchases: store.get('snapshot')?.purchases ?? [],
      };
      for (const event of eventsDuringReload) snapshot = withEvent(snapshot, event);
      store.set('snapshot', snapshot);
      markSynced();
    } finally {
      eventsDuringReload = null;
    }
    loadPurchases();
  }

  // Set while purchases are loading, so a slow connection does not collect
  // a pile of identical requests.
  let loadingPurchases = false;

  // Suggestions are a convenience: when loading fails, the device keeps the
  // purchases it already has and nobody is told.
  async function loadPurchases() {
    if (loadingPurchases) return;
    loadingPurchases = true;
    try {
      const records = await pb.collection('purchases').getFullList({ fields: 'id,text,count' });
      const snapshot = store.get('snapshot');
      // A slow response after logout must not put data back on the device.
      if (!snapshot) return;
      store.set('snapshot', { ...snapshot, purchases: records.map(({ id, text, count }) => ({ id, text, count })) });
      onPurchases();
    } catch (error) {
      console.warn('Loading purchases for suggestions failed; keeping the previous ones', error);
    } finally {
      loadingPurchases = false;
    }
  }

  async function flushOnce() {
    let outcome = await sendAll();
    if (outcome === 'done') {
      try {
        await reload();
      } catch (error) {
        outcome = classify({ type: 'reload' }, error);
        if (outcome === 'rejected') throw error;
      }
    }
    if (outcome === 'offline') onOffline();
    if (outcome === 'auth') onAuthError();
    onChange();
    return outcome;
  }

  // Only one flush runs at a time. A flush requested meanwhile runs once the
  // current one is done, so a change made during a flush is not left behind.
  let running = null;
  let requestedAgain = false;

  function flush() {
    if (running) {
      requestedAgain = true;
      return running;
    }
    running = (async () => {
      let outcome;
      do {
        requestedAgain = false;
        outcome = await flushOnce();
      } while (requestedAgain && outcome === 'done');
      return outcome;
    })().finally(() => {
      running = null;
    });
    return running;
  }

  // Applies a realtime event ({ action, record }) to the stored snapshot.
  function applyEvent(event) {
    eventsDuringReload?.push(event);
    store.set('snapshot', withEvent(store.get('snapshot') ?? { items: [], users: [] }, event));
    onChange();
  }

  return { flush, applyEvent, markSynced };
}
