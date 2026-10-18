// Changes made on the device that the server has not confirmed yet. Every
// change goes through here, online or offline, so both cases use the same
// code path.
//
// Operations, all safe to send more than once:
//   { type: 'create', id, text }
//   { type: 'setChecked', id, checked }   (an absolute value, never a toggle)
//   { type: 'setText', id, text }         (the whole new text)
//   { type: 'setClaimed', id, claimed }   (an absolute value, never a toggle)
// Each one also gets `opId` to identify it and `at`, the local time of the
// action, which the list uses to sort pending items.

import { newId } from './ids.js';

export function createOutbox(store, { now = () => new Date().toISOString(), makeId = newId } = {}) {
  const list = () => store.get('outbox') ?? [];

  return {
    list,

    add(op) {
      const entry = { ...op, opId: makeId(), at: now() };
      store.set('outbox', [...list(), entry]);
      return entry;
    },

    remove(entry) {
      store.set(
        'outbox',
        list().filter((op) => op.opId !== entry.opId),
      );
    },
  };
}
