// Sends pending changes to the server and keeps the stored snapshot up to
// date. Takes the PocketBase client and the stores as parameters, so it can be
// tested with fakes.

const ITEM_FIELDS = 'id,text,note,checked,checkedAt,created,createdBy,updatedBy,claimedBy,claimedAt';

// How a failed request affects the rest of the outbox.
function classify(op, error) {
  const status = error?.status ?? 0;
  // The SDK reports network failures and aborted requests as status 0.
  if (status === 0) return 'offline';
  if (status === 401 || status === 403) return 'auth';
  // Too many requests or a server problem: the change itself is fine, so keep
  // it and try again on the next trigger.
  if (status === 429 || status >= 500) return 'retry';
  if (status === 404 && ['setChecked', 'setText', 'setNote', 'setClaimed'].includes(op.type)) return 'deleted';
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

  // What the server confirmed, in the form of a realtime event, so it is
  // applied to the snapshot the same way.
  const saved = (record) => ({ action: 'update', record });
  const gone = (id) => ({ action: 'delete', record: { id } });

  // Returns what the server confirmed.
  async function send(op) {
    if (op.type === 'create') {
      // Changes stored before notes existed have none.
      return saved(await items().create({ id: op.id, text: op.text, note: op.note ?? '' }));
    } else if (op.type === 'setChecked') {
      return saved(await items().update(op.id, { checked: op.checked }));
    } else if (op.type === 'setText') {
      return saved(await items().update(op.id, { text: op.text }));
    } else if (op.type === 'setNote') {
      return saved(await items().update(op.id, { note: op.note }));
    } else if (op.type === 'setClaimed') {
      // The server records whoever sends the claim; the own id only says
      // "claimed", an empty value says "released".
      return saved(await items().update(op.id, { claimedBy: op.claimed ? pb.authStore.record.id : '' }));
    } else if (op.type === 'delete') {
      await items().delete(op.id);
      return gone(op.id);
    } else {
      throw new Error(`Unknown outbox operation: ${JSON.stringify(op)}`);
    }
  }

  // A retried create fails when the first attempt reached the server but its
  // response was lost. If the record exists, the create is done. Returns the
  // record, or null.
  async function findOnServer(id) {
    try {
      return await items().getOne(id, { fields: ITEM_FIELDS });
    } catch (error) {
      if (error?.status === 404) return null;
      throw error;
    }
  }

  // Realtime events received while a request is on its way. Its answer may
  // predate them, so they are applied again on top of it.
  let eventsDuringRequest = null;

  // Lets a change leave the outbox, after putting what the server confirmed
  // for it into the snapshot. Otherwise a confirmed change would vanish from
  // the screen until a reload succeeds, which can take long when the
  // connection drops right after the request.
  function confirm(op, change) {
    // Already gone when a logout discarded the outbox meanwhile; the storage
    // may then belong to nobody.
    if (!outbox.list().some((entry) => entry.opId === op.opId)) return;
    if (change) {
      let snapshot = withEvent(store.get('snapshot') ?? { items: [], users: [] }, change);
      for (const event of eventsDuringRequest) snapshot = withEvent(snapshot, event);
      store.set('snapshot', snapshot);
    }
    outbox.remove(op);
  }

  // Returns 'done', 'offline', 'auth' or 'retry'. Takes each change from the
  // outbox afresh: a logout empties it while a request is on its way, and
  // the changes it discarded must not go out under whoever logs in next.
  async function sendAll() {
    try {
      for (let op = outbox.list()[0]; op; op = outbox.list()[0]) {
        eventsDuringRequest = [];
        try {
          confirm(op, await send(op));
        } catch (error) {
          let outcome = classify(op, error);
          let change = null;
          if (outcome === 'maybe-duplicate') {
            try {
              const record = await findOnServer(op.id);
              outcome = record ? 'done' : 'rejected';
              if (record) change = saved(record);
            } catch (lookupError) {
              outcome = classify(op, lookupError);
            }
          }
          if (outcome === 'offline' || outcome === 'auth' || outcome === 'retry') return outcome;
          if (outcome === 'rejected') {
            console.error('Server rejected a pending change; dropping it', op, error);
            onRejected(op, error);
          }
          // An update or delete found no item: it no longer exists on the server.
          if (outcome === 'deleted' || (outcome === 'done' && op.type === 'delete')) change = gone(op.id);
          // 'done', 'deleted' and 'rejected' all leave the outbox.
          confirm(op, change);
          onChange();
        }
      }
      return 'done';
    } finally {
      eventsDuringRequest = null;
    }
  }

  // Remembers that the list is current as of now. Besides after a reload,
  // the app calls this when it stops being online, because realtime events
  // kept the list current until then.
  function markSynced() {
    store.set('lastSync', now());
  }

  // Loads the whole list and the family's names. The list is small, so this
  // is simpler than tracking changes and also covers events missed offline.
  // The purchases behind the suggestions load separately afterwards, so they
  // never hold up or break the list.
  async function reload() {
    eventsDuringRequest = [];
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
      for (const event of eventsDuringRequest) snapshot = withEvent(snapshot, event);
      store.set('snapshot', snapshot);
      markSynced();
    } finally {
      eventsDuringRequest = null;
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
    eventsDuringRequest?.push(event);
    store.set('snapshot', withEvent(store.get('snapshot') ?? { items: [], users: [] }, event));
    onChange();
  }

  return { flush, applyEvent, markSynced };
}
