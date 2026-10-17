import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRows } from '../../pb_public/js/view.js';

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
