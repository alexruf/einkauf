// Turns the app's state into what the screen shows: the rows of the list,
// the status bar indicators and the logout question. Pure, so it can be tested
// without a browser.

const UNKNOWN = 'Unbekannt';

// PocketBase dates look like "2026-10-17 12:00:00.000Z", local ones are ISO
// strings. Both become milliseconds; an empty date sorts as 0.
const toMs = (date) => (date ? Date.parse(date.replace(' ', 'T')) : 0);

// snapshot: { items, users } as last loaded from the server.
// ops: pending outbox operations in the order they were made.
// me: the id of the logged-in user, who made all pending changes.
export function buildRows(snapshot, ops, me) {
  const byId = new Map();
  for (const item of snapshot?.items ?? []) {
    byId.set(item.id, { ...item, pending: false });
  }

  for (const op of ops) {
    const item = byId.get(op.id);
    if (op.type === 'create' && !item) {
      byId.set(op.id, {
        id: op.id,
        text: op.text,
        checked: false,
        checkedAt: '',
        created: op.at,
        createdBy: me,
        updatedBy: me,
        pending: true,
      });
    } else if (op.type === 'setChecked' && item) {
      // A change to an item missing from the list belongs to an item that
      // was deleted meanwhile; it is not shown.
      byId.set(op.id, {
        ...item,
        checked: op.checked,
        checkedAt: op.checked ? op.at : '',
        updatedBy: me,
        pending: true,
      });
    }
  }

  const names = new Map((snapshot?.users ?? []).map((u) => [u.id, u.name]));
  const nameOf = (id) => names.get(id) || UNKNOWN;

  const rows = [...byId.values()].map((item) => {
    const creator = nameOf(item.createdBy);
    const editor = item.updatedBy ? nameOf(item.updatedBy) : creator;
    return {
      id: item.id,
      text: item.text,
      checked: item.checked,
      pending: item.pending,
      meta: item.updatedBy && item.updatedBy !== item.createdBy ? `von ${creator} · zuletzt ${editor}` : `von ${creator}`,
      created: toMs(item.created),
      checkedAt: toMs(item.checkedAt),
    };
  });

  // Open items oldest first, so the list reads in the order things were
  // added; then checked items, the most recently checked first.
  rows.sort((a, b) => {
    if (a.checked !== b.checked) return a.checked ? 1 : -1;
    const diff = a.checked ? b.checkedAt - a.checkedAt : a.created - b.created;
    return diff || a.id.localeCompare(b.id);
  });
  return rows;
}

const pad = (n) => String(n).padStart(2, '0');
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

// "heute, 14:32", "gestern, 18:05", "15.10., 09:10" or, in an earlier year,
// "30.12.25, 17:45", in local time. Short, so it fits the status bar.
function formatSyncTime(date, now) {
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (daysAgo === 0) return `heute, ${time}`;
  if (daysAgo === 1) return `gestern, ${time}`;
  const year = date.getFullYear() === now.getFullYear() ? '' : pad(date.getFullYear() % 100);
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${year}, ${time}`;
}

// The status bar shows two indicators, each a colored dot with a text. The
// state picks the color: 'ok' green, 'busy' and 'pending' yellow ('busy'
// pulses), 'error' red, 'idle' grey.

// connection: 'connecting', 'online' or 'offline'.
export function connectionIndicator(connection) {
  if (connection === 'online') return { state: 'ok', text: 'Verbunden' };
  if (connection === 'offline') return { state: 'error', text: 'Offline' };
  return { state: 'busy', text: 'Verbinde …' };
}

// pending: number of unsent changes; lastSync: ISO time up to which the list
// is known to be current, or undefined; now: a Date.
export function syncIndicator({ connection, pending, lastSync, now }) {
  if (connection === 'online') {
    if (pending === 0) return { state: 'ok', text: 'Synchronisiert' };
    return { state: 'busy', text: pending === 1 ? 'Sende 1 Änderung' : `Sende ${pending} Änderungen` };
  }
  // Not connected: say how old the list on screen is.
  const state = pending === 0 ? 'idle' : 'pending';
  if (!lastSync) return { state, text: 'Noch nicht synchronisiert' };
  return { state, text: `Stand ${formatSyncTime(new Date(lastSync), now)}` };
}

// The question of the logout dialog. Logging out deletes unsent changes, so
// the dialog says how many there are.
export function logoutQuestion(pending) {
  if (pending === 0) return 'Wirklich abmelden?';
  if (pending === 1) return '1 Änderung ist noch nicht übertragen und geht beim Abmelden verloren. Trotzdem abmelden?';
  return `${pending} Änderungen sind noch nicht übertragen und gehen beim Abmelden verloren. Trotzdem abmelden?`;
}
