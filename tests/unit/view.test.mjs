import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRows, connectionIndicator, logoutQuestion, syncIndicator } from '../../pb_public/js/view.js';

const users = [
  { id: 'anna', name: 'Anna' },
  { id: 'ben', name: 'Ben' },
];

const item = (id, fields = {}) => ({
  id,
  text: id,
  checked: false,
  checkedAt: '',
  created: '2026-10-17 08:00:00.000Z',
  createdBy: 'anna',
  updatedBy: 'anna',
  ...fields,
});

const texts = (rows) => rows.map((r) => r.text);

test('given open and checked items, then open ones come first by creation, checked ones by most recently checked', () => {
  const snapshot = {
    users,
    items: [
      item('checked-early', { checked: true, checkedAt: '2026-10-17 09:00:00.000Z' }),
      item('open-late', { created: '2026-10-17 08:30:00.000Z' }),
      item('checked-late', { checked: true, checkedAt: '2026-10-17 09:30:00.000Z' }),
      item('open-early', { created: '2026-10-17 08:10:00.000Z' }),
    ],
  };
  assert.deepEqual(texts(buildRows(snapshot, [], 'anna')), ['open-early', 'open-late', 'checked-late', 'checked-early']);
});

test('given a pending create, then it is shown as open, pending, by me, and sorted by the local time', () => {
  const snapshot = { users, items: [item('Milch', { created: '2026-10-17 08:00:00.000Z' })] };
  const ops = [{ type: 'create', id: 'eier', text: 'Eier', at: '2026-10-17T07:00:00.000Z' }];
  const rows = buildRows(snapshot, ops, 'ben');
  assert.deepEqual(texts(rows), ['Eier', 'Milch']);
  assert.equal(rows[0].pending, true);
  assert.equal(rows[0].checked, false);
  assert.equal(rows[0].meta, 'von Ben');
  assert.equal(rows[1].pending, false);
});

test('given a pending check-off, then the item is shown checked, pending and last changed by me', () => {
  const snapshot = { users, items: [item('Milch'), item('Brot')] };
  const ops = [{ type: 'setChecked', id: 'Milch', checked: true, at: '2026-10-17T10:00:00.000Z' }];
  const rows = buildRows(snapshot, ops, 'ben');
  assert.deepEqual(texts(rows), ['Brot', 'Milch']);
  assert.equal(rows[1].checked, true);
  assert.equal(rows[1].pending, true);
  assert.equal(rows[1].meta, 'von Anna · zuletzt Ben');
});

test('given a pending create that is then checked off, then it is shown checked and pending', () => {
  const ops = [
    { type: 'create', id: 'eier', text: 'Eier', at: '2026-10-17T10:00:00.000Z' },
    { type: 'setChecked', id: 'eier', checked: true, at: '2026-10-17T10:01:00.000Z' },
  ];
  const [row] = buildRows({ users, items: [] }, ops, 'anna');
  assert.equal(row.checked, true);
  assert.equal(row.pending, true);
});

test('given a pending un-check, then the item is shown open again', () => {
  const snapshot = { users, items: [item('Milch', { checked: true, checkedAt: '2026-10-17 09:00:00.000Z' })] };
  const ops = [{ type: 'setChecked', id: 'Milch', checked: false, at: '2026-10-17T10:00:00.000Z' }];
  const [row] = buildRows(snapshot, ops, 'anna');
  assert.equal(row.checked, false);
});

test('given a pending check-off of an item no longer on the server, then it is not shown', () => {
  const ops = [{ type: 'setChecked', id: 'gone', checked: true, at: '2026-10-17T10:00:00.000Z' }];
  assert.deepEqual(buildRows({ users, items: [] }, ops, 'anna'), []);
});

test('given a pending create the server already has, then the item is shown once and not pending', () => {
  const snapshot = { users, items: [item('eier')] };
  const ops = [{ type: 'create', id: 'eier', text: 'eier', at: '2026-10-17T10:00:00.000Z' }];
  const rows = buildRows(snapshot, ops, 'anna');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].pending, false);
});

test('given an item whose creator was deleted, then the creator is shown as Unbekannt', () => {
  const snapshot = { users, items: [item('Brot', { createdBy: '', updatedBy: 'ben' }), item('Salz', { createdBy: '', updatedBy: '' })] };
  const rows = buildRows(snapshot, [], 'anna');
  assert.equal(rows[0].meta, 'von Unbekannt · zuletzt Ben');
  assert.equal(rows[1].meta, 'von Unbekannt');
});

test('given an item changed by someone else, then the meta line names creator and last editor', () => {
  const [row] = buildRows({ users, items: [item('Brot', { updatedBy: 'ben' })] }, [], 'anna');
  assert.equal(row.meta, 'von Anna · zuletzt Ben');
});

test('given no snapshot yet, then only pending items are shown', () => {
  const ops = [{ type: 'create', id: 'eier', text: 'Eier', at: '2026-10-17T10:00:00.000Z' }];
  assert.deepEqual(texts(buildRows(undefined, ops, 'anna')), ['Eier']);
});

// Local dates, so the expected times hold in every time zone.
const at = (day, hours, minutes) => new Date(2026, 9, day, hours, minutes);
const now = at(18, 20, 0);
const offlineSync = (lastSync, pending = 0) => syncIndicator({ connection: 'offline', pending, lastSync: lastSync?.toISOString(), now });

test('given the connection states, then the connection indicator shows state and text for each', () => {
  assert.deepEqual(connectionIndicator('connecting'), { state: 'busy', text: 'Verbinde …' });
  assert.deepEqual(connectionIndicator('online'), { state: 'ok', text: 'Verbunden' });
  assert.deepEqual(connectionIndicator('offline'), { state: 'error', text: 'Offline' });
});

test('given the app is online without pending changes, then the sync indicator says synchronized', () => {
  assert.deepEqual(syncIndicator({ connection: 'online', pending: 0, lastSync: undefined, now }), { state: 'ok', text: 'Synchronisiert' });
});

test('given the app is online with pending changes, then the sync indicator says how many are being sent', () => {
  const indicator = (pending) => syncIndicator({ connection: 'online', pending, lastSync: undefined, now });
  assert.deepEqual(indicator(1), { state: 'busy', text: 'Sende 1 Änderung' });
  assert.deepEqual(indicator(2), { state: 'busy', text: 'Sende 2 Änderungen' });
});

test('given the app is not online after a sync today, then the sync indicator shows today and the time', () => {
  assert.deepEqual(offlineSync(at(18, 14, 32)), { state: 'idle', text: 'Stand heute, 14:32' });
});

test('given the app is not online after a sync yesterday, then the sync indicator shows yesterday and the time', () => {
  assert.deepEqual(offlineSync(at(17, 18, 5)), { state: 'idle', text: 'Stand gestern, 18:05' });
});

test('given the app is not online after an older sync this year, then the sync indicator shows day, month and time', () => {
  assert.deepEqual(offlineSync(at(15, 9, 10)), { state: 'idle', text: 'Stand 15.10., 09:10' });
});

test('given the app is not online after a sync in an earlier year, then the sync indicator includes the year', () => {
  assert.deepEqual(offlineSync(new Date(2025, 11, 30, 17, 45)), { state: 'idle', text: 'Stand 30.12.25, 17:45' });
});

test('given the app is connecting, then the sync indicator shows the time of the last sync', () => {
  const indicator = syncIndicator({ connection: 'connecting', pending: 0, lastSync: at(18, 14, 32).toISOString(), now });
  assert.deepEqual(indicator, { state: 'idle', text: 'Stand heute, 14:32' });
});

test('given the app is not online with pending changes, then the sync indicator shows the time as pending', () => {
  assert.deepEqual(offlineSync(at(18, 14, 32), 1), { state: 'pending', text: 'Stand heute, 14:32' });
});

test('given the app is not online and never synced, then the sync indicator says not synchronized yet', () => {
  assert.deepEqual(offlineSync(undefined), { state: 'idle', text: 'Noch nicht synchronisiert' });
  assert.deepEqual(offlineSync(undefined, 2), { state: 'pending', text: 'Noch nicht synchronisiert' });
});

test('given no pending changes, then the logout question is a plain confirmation', () => {
  assert.equal(logoutQuestion(0), 'Wirklich abmelden?');
});

test('given pending changes, then the logout question says how many will be lost', () => {
  assert.equal(logoutQuestion(1), '1 Änderung ist noch nicht übertragen und geht beim Abmelden verloren. Trotzdem abmelden?');
  assert.equal(logoutQuestion(2), '2 Änderungen sind noch nicht übertragen und gehen beim Abmelden verloren. Trotzdem abmelden?');
});
