// Turns the last known server state plus the pending changes into the rows
// the list shows. Pure, so it can be tested without a browser.

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
