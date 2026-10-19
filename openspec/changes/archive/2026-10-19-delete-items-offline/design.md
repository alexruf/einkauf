# Design

## Context

See proposal.md for the motivation and the delta specs for the requirements.

The current state that shapes the approach:

- Every change except deleting goes through the outbox (`outbox.js`). Its
  operations are absolute values, so sending one twice is harmless. `sync.js`
  sends them in order; `classify` decides per failure whether to stop
  (offline, auth, retry) or to drop the entry (done, deleted, rejected).
- `view.buildRows` lays the pending operations over the last snapshot from the
  server. A `setChecked`, `setText` or `setClaimed` for an id missing from the
  snapshot and from pending creates is not shown.
- `app.js` deletes directly with `pb.collection('items').delete(id)`. It keeps
  a `runningDeletes` counter so that `reloadIfIdle` does not reload during a
  request, applies a local delete event on success, and disables the delete
  button while not online or while the row is pending.
- The server needs no change: the items `deleteRule` lets every family member
  delete, and a delete of a missing record answers 404.

## Goals / Non-Goals

**Goals:**
- Deleting uses the same outbox and sync path as every other change, so the
  separate code path and its reload guard disappear.
- One new outbox operation; no new modules and no server change.

**Non-Goals:**
- Shortening the outbox, for example by dropping a pending create together
  with its later delete.
- Undo, or showing deleted items as pending until they are synchronized.

## Decisions

### A new outbox operation `delete`

`{ type: 'delete', id }` is sent as `items.delete(id)`. `classify` treats a
404 for `delete` as `done`: the item is gone, which is what the user wanted,
whether the first attempt already arrived or someone else deleted it. Other
failures follow the existing rules, so offline, 401/403, 429 and 5xx keep the
entry and stop the flush.

Alternative considered: keep deleting outside the outbox and only queue it
when offline. Rejected because it keeps two code paths for one action, which
is the complexity this change removes.

### A pending create followed by a delete sends both

The delete is appended like any other operation. If the item was added
offline, the outbox sends the create and then the delete. Removing the
pending create instead looks simpler but is wrong in one case: the create may
already have reached the server with its response lost. Dropping it locally
would then leave the item on the server for good. Sending both always ends
with the item deleted, at the cost of a brief create and delete event for
other users.

Earlier pending changes to the same item stay in the outbox as well and are
sent before the delete. They are harmless and keep the outbox a plain queue.

### `buildRows` hides items with a pending delete

A pending `delete` removes the item from the rows, whether it came from the
snapshot or from a pending create. Because the operations are applied on top
of every snapshot, the item also stays hidden when a reload or a realtime
event from someone else brings it back before the delete is sent. Operations
after a delete for the same id cannot come from the UI, since the row is gone;
if one exists, it finds no item and is not shown, as today.

The deleted item is not shown as a pending row, unlike other offline changes.
Online, deleting already removes the row at once, so offline behaves the same.
The pending count in the status bar and the logout question already count
every outbox entry, so they cover the delete without extra code.

### The edit row deletes through the outbox

The delete button closes the edit mode, adds the `delete` operation, renders
and flushes, like `setText`. The button is always enabled, and the
`.edit-hint` paragraph and its style are removed. `deleteItem`, the
`runningDeletes` counter and its use in `reloadIfIdle` go away: a reload no
longer loses a delete, because it survives in the outbox.

## Risks / Trade-offs

- [A delete made offline wins against a later online edit by someone else,
  which may surprise them] → This is the existing "last change wins" rule,
  now stated in the spec with a scenario. Deletes are rare and deliberate.
- [Other users briefly see an item that was added and deleted offline] →
  Accepted; it appears and disappears within one sync.
- [A mistaken delete offline cannot be taken back once synchronized] → Same
  as online today; undo is out of scope.

## Migration Plan

Frontend only. Old outbox entries have no `delete` operations, and a client
that still runs the old version keeps deleting online, so mixed versions work
side by side. The service worker update flow ships the new app as usual.
Rollback is a redeploy of the previous release, with one catch: the old
`send` throws "Unknown outbox operation" without a status for a `delete`
still in an outbox, `classify` reads that as offline, and that device stops
syncing until the user logs out. A rollback should therefore only happen
when no device has unsent deletes, or be a new release that keeps sending
`delete`.
