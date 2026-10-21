import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildRows, connectionIndicator, layoutKey, logoutQuestion, syncIndicator } from '../../pb_public/js/view.js';

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
  assert.deepEqual(texts(buildRows(snapshot, [], 'anna')), [
    'open-early',
    'open-late',
    'checked-late',
    'checked-early',
  ]);
});

test('given a held check-off, then the row keeps its open position and section but is shown checked', () => {
  const snapshot = {
    users,
    items: [
      item('Milch', { created: '2026-10-17 08:00:00.000Z' }),
      item('Brot', { created: '2026-10-17 08:10:00.000Z' }),
      item('Salz', { checked: true, checkedAt: '2026-10-17 07:00:00.000Z' }),
    ],
  };
  const ops = [{ type: 'setChecked', id: 'Milch', checked: true, at: '2026-10-17T10:00:00.000Z' }];
  const held = new Map([['Milch', { checked: false, checkedAt: 0 }]]);
  const rows = buildRows(snapshot, ops, 'anna', held);
  assert.deepEqual(texts(rows), ['Milch', 'Brot', 'Salz']);
  assert.equal(rows[0].checked, true);
  assert.equal(rows[0].section, 'open');
  assert.equal(rows[2].section, 'done');
});

test('given a held un-check, then the row stays among the checked-off rows with its old checked time', () => {
  const snapshot = {
    users,
    items: [
      item('Brot'),
      item('Milch', { checked: true, checkedAt: '2026-10-17 09:00:00.000Z' }),
      item('Salz', { checked: true, checkedAt: '2026-10-17 08:00:00.000Z' }),
    ],
  };
  const ops = [{ type: 'setChecked', id: 'Salz', checked: false, at: '2026-10-17T10:00:00.000Z' }];
  const held = new Map([['Salz', { checked: true, checkedAt: Date.parse('2026-10-17T08:00:00.000Z') }]]);
  const rows = buildRows(snapshot, ops, 'anna', held);
  assert.deepEqual(texts(rows), ['Brot', 'Milch', 'Salz']);
  assert.equal(rows[2].checked, false);
  assert.equal(rows[2].section, 'done');
});

test('given nothing held, then each row is in the section of its own state', () => {
  const snapshot = {
    users,
    items: [item('Milch'), item('Salz', { checked: true, checkedAt: '2026-10-17 08:00:00.000Z' })],
  };
  const rows = buildRows(snapshot, [], 'anna');
  assert.deepEqual(
    rows.map((r) => [r.text, r.section]),
    [
      ['Milch', 'open'],
      ['Salz', 'done'],
    ],
  );
});

test('given the same rows with other states, then the layout key is the same', () => {
  const snapshot = { users, items: [item('Milch'), item('Brot')] };
  const before = buildRows(snapshot, [], 'anna');
  const ops = [{ type: 'setText', id: 'Milch', text: 'Hafermilch', at: '2026-10-17T10:00:00.000Z' }];
  assert.equal(layoutKey(buildRows(snapshot, ops, 'anna'), false), layoutKey(before, false));
});

test('given a row moved to another section, an added row or a toggled section, then the layout key changes', () => {
  const snapshot = { users, items: [item('Milch'), item('Brot')] };
  const before = layoutKey(buildRows(snapshot, [], 'anna'), false);
  const checked = [{ type: 'setChecked', id: 'Milch', checked: true, at: '2026-10-17T10:00:00.000Z' }];
  const added = [{ type: 'create', id: 'eier', text: 'Eier', at: '2026-10-17T10:00:00.000Z' }];
  assert.notEqual(layoutKey(buildRows(snapshot, checked, 'anna'), false), before);
  assert.notEqual(layoutKey(buildRows(snapshot, added, 'anna'), false), before);
  assert.notEqual(layoutKey(buildRows(snapshot, [], 'anna'), true), before);
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

test('given a pending create with a note, then its row has that note', () => {
  const ops = [{ type: 'create', id: 'milch', text: 'Milch', note: '2x', at: '2026-10-17T07:00:00.000Z' }];
  const [row] = buildRows({ users, items: [] }, ops, 'ben');
  assert.equal(row.text, 'Milch');
  assert.equal(row.note, '2x');
});

test('given a pending create stored without a note, then its row has an empty note', () => {
  const ops = [{ type: 'create', id: 'milch', text: 'Milch', at: '2026-10-17T07:00:00.000Z' }];
  assert.equal(buildRows({ users, items: [] }, ops, 'ben')[0].note, '');
});

test('given a snapshot item stored without a note, then its row has an empty note', () => {
  assert.equal(buildRows({ users, items: [item('Milch')] }, [], 'anna')[0].note, '');
});

test('given a snapshot item stored without an id, then it is not shown', () => {
  assert.deepEqual(texts(buildRows({ users, items: [{}, item('Milch')] }, [], 'anna')), ['Milch']);
});

test('given a pending note change, then only the note changes, the row is pending and I am last editor', () => {
  const snapshot = {
    users,
    items: [item('Milch', { note: '1x', checked: true, checkedAt: '2026-10-17 09:00:00.000Z' })],
  };
  const ops = [{ type: 'setNote', id: 'Milch', note: '2x', at: '2026-10-17T10:00:00.000Z' }];
  const [row] = buildRows(snapshot, ops, 'ben');
  assert.equal(row.note, '2x');
  assert.equal(row.text, 'Milch');
  assert.equal(row.checked, true);
  assert.equal(row.pending, true);
  assert.equal(
    buildRows({ ...snapshot, items: [item('Milch', { note: '1x' })] }, ops, 'ben')[0].meta,
    'von Anna · zuletzt Ben',
  );
});

test('given a pending note change of an item missing from the snapshot, then no row is shown', () => {
  const ops = [{ type: 'setNote', id: 'Milch', note: '2x', at: '2026-10-17T10:00:00.000Z' }];
  assert.deepEqual(buildRows({ users, items: [] }, ops, 'ben'), []);
});

test('given a pending check-off, then the item is shown checked and pending', () => {
  const snapshot = { users, items: [item('Milch'), item('Brot')] };
  const ops = [{ type: 'setChecked', id: 'Milch', checked: true, at: '2026-10-17T10:00:00.000Z' }];
  const rows = buildRows(snapshot, ops, 'ben');
  assert.deepEqual(texts(rows), ['Brot', 'Milch']);
  assert.equal(rows[1].checked, true);
  assert.equal(rows[1].pending, true);
});

test('given a checked-off item, then its row has no meta line', () => {
  const snapshot = {
    users,
    items: [item('Milch', { checked: true, checkedAt: '2026-10-17 09:00:00.000Z', updatedBy: 'ben' })],
  };
  assert.equal(buildRows(snapshot, [], 'anna')[0].meta, '');
});

test('given a pending un-check by me, then the meta line names me as last editor again', () => {
  const snapshot = { users, items: [item('Milch', { checked: true, checkedAt: '2026-10-17 09:00:00.000Z' })] };
  const ops = [{ type: 'setChecked', id: 'Milch', checked: false, at: '2026-10-17T10:00:00.000Z' }];
  assert.equal(buildRows(snapshot, ops, 'ben')[0].meta, 'von Anna · zuletzt Ben');
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

test('given a pending text change, then the item shows the new text, pending and last changed by me', () => {
  const snapshot = { users, items: [item('milch', { text: 'Milch' })] };
  const ops = [{ type: 'setText', id: 'milch', text: 'Hafermilch', at: '2026-10-17T10:00:00.000Z' }];
  const [row] = buildRows(snapshot, ops, 'ben');
  assert.equal(row.text, 'Hafermilch');
  assert.equal(row.pending, true);
  assert.equal(row.meta, 'von Anna · zuletzt Ben');
});

test('given a pending text change of a checked item, then it stays checked in its place', () => {
  const snapshot = {
    users,
    items: [item('brot', { text: 'Brot', checked: true, checkedAt: '2026-10-17 09:00:00.000Z' })],
  };
  const ops = [{ type: 'setText', id: 'brot', text: 'Vollkornbrot', at: '2026-10-17T10:00:00.000Z' }];
  const [row] = buildRows(snapshot, ops, 'anna');
  assert.equal(row.checked, true);
  assert.equal(row.checkedAt, Date.parse('2026-10-17T09:00:00.000Z'));
});

test('given a pending create that is then edited, then it is shown once with the new text', () => {
  const ops = [
    { type: 'create', id: 'eier', text: 'Eier', at: '2026-10-17T10:00:00.000Z' },
    { type: 'setText', id: 'eier', text: 'Eier 10x', at: '2026-10-17T10:01:00.000Z' },
  ];
  const rows = buildRows({ users, items: [] }, ops, 'anna');
  assert.deepEqual(texts(rows), ['Eier 10x']);
  assert.equal(rows[0].pending, true);
});

test('given a pending text change of an item no longer on the server, then it is not shown', () => {
  const ops = [{ type: 'setText', id: 'gone', text: 'Neu', at: '2026-10-17T10:00:00.000Z' }];
  assert.deepEqual(buildRows({ users, items: [] }, ops, 'anna'), []);
});

test('given a pending delete, then the item is not shown', () => {
  const snapshot = { users, items: [item('milch', { text: 'Milch' }), item('brot', { text: 'Brot' })] };
  const ops = [{ type: 'delete', id: 'milch', at: '2026-10-17T10:00:00.000Z' }];
  assert.deepEqual(texts(buildRows(snapshot, ops, 'anna')), ['Brot']);
});

test('given a pending create that is then deleted, then the item is not shown', () => {
  const ops = [
    { type: 'create', id: 'eier', text: 'Eier', at: '2026-10-17T10:00:00.000Z' },
    { type: 'delete', id: 'eier', at: '2026-10-17T10:01:00.000Z' },
  ];
  assert.deepEqual(buildRows({ users, items: [] }, ops, 'anna'), []);
});

test('given a pending delete of an item the server already has from the create, then the item is not shown', () => {
  const snapshot = { users, items: [item('eier', { text: 'Eier' })] };
  const ops = [
    { type: 'create', id: 'eier', text: 'Eier', at: '2026-10-17T10:00:00.000Z' },
    { type: 'delete', id: 'eier', at: '2026-10-17T10:01:00.000Z' },
  ];
  assert.deepEqual(buildRows(snapshot, ops, 'anna'), []);
});

test('given a pending check-off after a pending delete of the same item, then it is not shown', () => {
  const snapshot = { users, items: [item('milch', { text: 'Milch' })] };
  const ops = [
    { type: 'delete', id: 'milch', at: '2026-10-17T10:00:00.000Z' },
    { type: 'setChecked', id: 'milch', checked: true, at: '2026-10-17T10:01:00.000Z' },
  ];
  assert.deepEqual(buildRows(snapshot, ops, 'anna'), []);
});

test('given a pending create the server already has, then the item is shown once and not pending', () => {
  const snapshot = { users, items: [item('eier')] };
  const ops = [{ type: 'create', id: 'eier', text: 'eier', at: '2026-10-17T10:00:00.000Z' }];
  const rows = buildRows(snapshot, ops, 'anna');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].pending, false);
});

test('given an item whose creator was deleted, then the creator is shown as Unbekannt', () => {
  const snapshot = {
    users,
    items: [item('Brot', { createdBy: '', updatedBy: 'ben' }), item('Salz', { createdBy: '', updatedBy: '' })],
  };
  const rows = buildRows(snapshot, [], 'anna');
  assert.equal(rows[0].meta, 'von Unbekannt · zuletzt Ben');
  assert.equal(rows[1].meta, 'von Unbekannt');
});

test('given an item changed by someone else, then the meta line names creator and last editor', () => {
  const [row] = buildRows({ users, items: [item('Brot', { updatedBy: 'ben' })] }, [], 'anna');
  assert.equal(row.meta, 'von Anna · zuletzt Ben');
});

test('given an unclaimed item, then its row has no claim', () => {
  const [row] = buildRows({ users, items: [item('Milch')] }, [], 'anna');
  assert.equal(row.claim, null);
  assert.equal(row.claimant, null);
});

test('given an item claimed by me, then the row says I get it', () => {
  const [row] = buildRows({ users, items: [item('Milch', { claimedBy: 'anna' })] }, [], 'anna');
  assert.equal(row.claim, 'mine');
  assert.equal(row.claimant, 'Anna');
  assert.equal(row.meta, 'Du besorgst das');
});

test('given an item claimed by someone else, then the row names them', () => {
  const [row] = buildRows({ users, items: [item('Milch', { claimedBy: 'ben' })] }, [], 'anna');
  assert.equal(row.claim, 'other');
  assert.equal(row.claimant, 'Ben');
  assert.equal(row.meta, 'Ben besorgt das');
});

test('given an item claimed by an unknown user, then the claimant is shown as Unbekannt', () => {
  const [row] = buildRows({ users, items: [item('Milch', { claimedBy: 'gone' })] }, [], 'anna');
  assert.equal(row.claim, 'other');
  assert.equal(row.meta, 'Unbekannt besorgt das');
});

test('given a pending claim, then the item is claimed by me, pending and last changed by me', () => {
  const ops = [{ type: 'setClaimed', id: 'Milch', claimed: true, at: '2026-10-17T10:00:00.000Z' }];
  const [row] = buildRows({ users, items: [item('Milch')] }, ops, 'ben');
  assert.equal(row.claim, 'mine');
  assert.equal(row.pending, true);
  assert.equal(row.meta, 'Du besorgst das');
  // Once released, the meta line shows the last editor again.
  const released = buildRows({ users, items: [item('Milch')] }, [...ops, { ...ops[0], claimed: false }], 'ben')[0];
  assert.equal(released.claim, null);
  assert.equal(released.meta, 'von Anna · zuletzt Ben');
});

test("given a pending release of someone else's claim, then the item is unclaimed and pending", () => {
  const ops = [{ type: 'setClaimed', id: 'Milch', claimed: false, at: '2026-10-17T10:00:00.000Z' }];
  const [row] = buildRows({ users, items: [item('Milch', { claimedBy: 'anna' })] }, ops, 'ben');
  assert.equal(row.claim, null);
  assert.equal(row.pending, true);
});

test('given a pending claim of a checked item, then it is ignored', () => {
  const ops = [{ type: 'setClaimed', id: 'Milch', claimed: true, at: '2026-10-17T10:00:00.000Z' }];
  const [row] = buildRows(
    { users, items: [item('Milch', { checked: true, checkedAt: '2026-10-17 09:00:00.000Z' })] },
    ops,
    'ben',
  );
  assert.equal(row.claim, null);
  assert.equal(row.pending, false);
});

test('given a pending check-off of a claimed item, then the claim is gone', () => {
  const ops = [{ type: 'setChecked', id: 'Milch', checked: true, at: '2026-10-17T10:00:00.000Z' }];
  const [row] = buildRows({ users, items: [item('Milch', { claimedBy: 'anna' })] }, ops, 'ben');
  assert.equal(row.checked, true);
  assert.equal(row.claim, null);
});

test('given a pending claim of an item no longer on the server, then it is not shown', () => {
  const ops = [{ type: 'setClaimed', id: 'Milch', claimed: true, at: '2026-10-17T10:00:00.000Z' }];
  assert.deepEqual(buildRows({ users, items: [] }, ops, 'ben'), []);
});

test('given no snapshot yet, then only pending items are shown', () => {
  const ops = [{ type: 'create', id: 'eier', text: 'Eier', at: '2026-10-17T10:00:00.000Z' }];
  assert.deepEqual(texts(buildRows(undefined, ops, 'anna')), ['Eier']);
});

// Local dates, so the expected times hold in every time zone.
const at = (day, hours, minutes) => new Date(2026, 9, day, hours, minutes);
const now = at(18, 20, 0);
const offlineSync = (lastSync, pending = 0) =>
  syncIndicator({ connection: 'offline', pending, lastSync: lastSync?.toISOString(), now });

test('given the connection states with pending changes, then the connection indicator shows state and text for each', () => {
  assert.deepEqual(connectionIndicator({ connection: 'connecting', pending: 1 }), {
    state: 'busy',
    text: 'Verbinde …',
  });
  assert.deepEqual(connectionIndicator({ connection: 'online', pending: 1 }), { state: 'ok', text: 'Verbunden' });
  assert.deepEqual(connectionIndicator({ connection: 'offline', pending: 1 }), { state: 'error', text: 'Offline' });
});

test('given the app is online without pending changes, then the connection indicator is hidden', () => {
  assert.equal(connectionIndicator({ connection: 'online', pending: 0 }), false);
});

test('given the app is not online without pending changes, then the connection indicator is still shown', () => {
  assert.deepEqual(connectionIndicator({ connection: 'connecting', pending: 0 }), {
    state: 'busy',
    text: 'Verbinde …',
  });
  assert.deepEqual(connectionIndicator({ connection: 'offline', pending: 0 }), { state: 'error', text: 'Offline' });
});

test('given the app is online without pending changes, then the sync indicator says synchronized', () => {
  assert.deepEqual(syncIndicator({ connection: 'online', pending: 0, lastSync: undefined, now }), {
    state: 'ok',
    text: 'Synchronisiert',
  });
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
  const indicator = syncIndicator({
    connection: 'connecting',
    pending: 0,
    lastSync: at(18, 14, 32).toISOString(),
    now,
  });
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
  assert.equal(
    logoutQuestion(1),
    '1 Änderung ist noch nicht übertragen und geht beim Abmelden verloren. Trotzdem abmelden?',
  );
  assert.equal(
    logoutQuestion(2),
    '2 Änderungen sind noch nicht übertragen und gehen beim Abmelden verloren. Trotzdem abmelden?',
  );
});
