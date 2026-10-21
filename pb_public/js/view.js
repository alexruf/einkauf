// Turns the app's state into what the screen shows: the rows of the list,
// the status bar indicators and the logout question. Pure, so it can be tested
// without a browser.

import { formatDate, formatTime, t } from './i18n.js';

// PocketBase dates look like "2026-10-17 12:00:00.000Z", local ones are ISO
// strings. Both become milliseconds; an empty date sorts as 0.
const toMs = (date) => (date ? Date.parse(date.replace(' ', 'T')) : 0);

// snapshot: { items, users } as last loaded from the server.
// ops: pending outbox operations in the order they were made.
// me: the id of the logged-in user, who made all pending changes.
// held: sort keys ({ checked, checkedAt }) of items held in place after the
// user's own change, by item id; see hold.js. A held row shows its current
// state but keeps the position and section of its key.
export function buildRows(snapshot, ops, me, held = new Map()) {
  const byId = new Map();
  for (const item of snapshot?.items ?? []) {
    // Older versions could store an empty item when an answer from the
    // server was cut off. Showing it would break the list, and the next
    // reload from the server replaces it.
    if (!item.id) continue;
    byId.set(item.id, { ...item, pending: false });
  }

  for (const op of ops) {
    const item = byId.get(op.id);
    if (op.type === 'create' && !item) {
      byId.set(op.id, {
        id: op.id,
        text: op.text,
        note: op.note ?? '',
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
        // The server releases the claim of an item that is checked off.
        claimedBy: op.checked ? '' : item.claimedBy,
        updatedBy: me,
        pending: true,
      });
    } else if (op.type === 'setText' && item) {
      byId.set(op.id, { ...item, text: op.text, updatedBy: me, pending: true });
    } else if (op.type === 'setNote' && item) {
      byId.set(op.id, { ...item, note: op.note, updatedBy: me, pending: true });
    } else if (op.type === 'setClaimed' && item && !item.checked) {
      // The server ignores claims of checked items, so they are not shown.
      byId.set(op.id, { ...item, claimedBy: op.claimed ? me : '', updatedBy: me, pending: true });
    } else if (op.type === 'delete') {
      // Hidden right away, as an online delete would be, and also while a
      // reload still brings the item back before the delete is sent.
      byId.delete(op.id);
    }
  }

  const names = new Map((snapshot?.users ?? []).map((u) => [u.id, u.name]));
  const nameOf = (id) => names.get(id) || t('user.unknown');

  const rows = [...byId.values()].map((item) => {
    const creator = nameOf(item.createdBy);
    const editor = item.updatedBy ? nameOf(item.updatedBy) : creator;
    const claim = item.claimedBy ? (item.claimedBy === me ? 'mine' : 'other') : null;
    const claimant = claim && nameOf(item.claimedBy);
    let meta =
      item.updatedBy && item.updatedBy !== item.createdBy
        ? t('item.meta.edited', { creator, editor })
        : t('item.meta.added', { creator });
    // While claimed, who gets the item matters more than who added it.
    if (claim === 'mine') meta = t('item.meta.claimedByMe');
    if (claim === 'other') meta = t('item.meta.claimedBy', { name: claimant });
    // Once an item is bought, who added or changed it no longer matters.
    if (item.checked) meta = '';
    const checkedAt = toMs(item.checkedAt);
    const sortKey = held.get(item.id) ?? { checked: item.checked, checkedAt };
    return {
      id: item.id,
      text: item.text,
      // Items stored before notes existed have none.
      note: item.note ?? '',
      checked: item.checked,
      section: sortKey.checked ? 'done' : 'open',
      pending: item.pending,
      claim,
      claimant,
      meta,
      created: toMs(item.created),
      checkedAt,
      sortKey,
    };
  });

  // Open items oldest first, so the list reads in the order things were
  // added; then checked items, the most recently checked first.
  rows.sort((a, b) => {
    const [ka, kb] = [a.sortKey, b.sortKey];
    if (ka.checked !== kb.checked) return ka.checked ? 1 : -1;
    const diff = ka.checked ? kb.checkedAt - ka.checkedAt : a.created - b.created;
    return diff || a.id.localeCompare(b.id);
  });
  return rows;
}

// Describes where each row is: its order and section, and whether the
// "Erledigt" section is open. Rows only move on screen when this changes, so
// the app animates exactly those renders.
export function layoutKey(rows, doneOpen) {
  return `${doneOpen}|${rows.map((row) => `${row.id}:${row.section}`).join(',')}`;
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

// "heute, 14:32", "gestern, 18:05", "15.10., 09:10" or, in an earlier year,
// "30.12.25, 17:45", in local time. Short, so it fits the status bar.
function formatSyncTime(date, now) {
  const time = formatTime(date);
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (daysAgo === 0) return t('time.today', { time });
  if (daysAgo === 1) return t('time.yesterday', { time });
  const year = date.getFullYear() !== now.getFullYear();
  return t('time.date', { date: formatDate(date, { year }), time });
}

// The status bar shows up to two indicators, each a colored dot with a text. The
// state picks the color: 'ok' green, 'busy' and 'pending' yellow ('busy'
// pulses), 'error' red, 'idle' grey.

// connection: 'connecting', 'online' or 'offline'; pending: number of unsent
// changes. Returns false while online with nothing to send: the sync
// indicator then says "Synchronisiert", which already implies the connection.
export function connectionIndicator({ connection, pending }) {
  if (connection === 'online') return pending === 0 ? false : { state: 'ok', text: t('status.connection.online') };
  if (connection === 'offline') return { state: 'error', text: t('status.connection.offline') };
  return { state: 'busy', text: t('status.connection.connecting') };
}

// pending: number of unsent changes; lastSync: ISO time up to which the list
// is known to be current, or undefined; now: a Date.
export function syncIndicator({ connection, pending, lastSync, now }) {
  if (connection === 'online') {
    if (pending === 0) return { state: 'ok', text: t('status.sync.done') };
    return { state: 'busy', text: t('status.sync.sending', { count: pending }) };
  }
  // Not connected: say how old the list on screen is.
  const state = pending === 0 ? 'idle' : 'pending';
  if (!lastSync) return { state, text: t('status.sync.never') };
  return { state, text: t('status.sync.since', { when: formatSyncTime(new Date(lastSync), now) }) };
}

// The question of the logout dialog. Logging out deletes unsent changes, so
// the dialog says how many there are.
export function logoutQuestion(pending) {
  if (pending === 0) return t('logout.question');
  return t('logout.questionPending', { count: pending });
}
