# Proposal

## Why

Deleting is the only change that still needs a connection. Inside a shop the
connection is often gone, so a family member who wants to remove a wrong or
duplicate item has to remember to do it later. Deleting also has its own code
path in the app, outside the outbox, with extra state that guards against a
reload interrupting a running delete request. Every other change already goes
through the outbox and works offline.

## What Changes

- Deleting an item goes through the outbox like every other change. It works
  offline, and the item disappears from the user's list at once.
- A pending delete counts as an unsent change: the sync indicator counts it,
  and the logout question warns that it would be lost.
- The delete button in the edit mode is always available, also for items that
  are not synchronized yet. The hint "Löschen ist nur online möglich." goes
  away.
- Sending the same delete twice has no side effect: if the item is already
  gone on the server, the delete counts as done.
- Deleting an item that was added offline and never reached the server sends
  the add and then the delete, so the item ends up deleted everywhere.
- Conflicts follow the existing rule that the change reaching the server last
  wins. A delete synchronized after someone else's change still deletes the
  item. A change synchronized after someone else's delete is discarded, as
  today.
- Out of scope: undoing a delete, a confirmation question, and deleting
  several items at once.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `shopping-list`: "Delete an item" no longer requires a connection; the
  "Deleting while offline" scenario changes from "shown as unavailable" to
  "works and is synchronized later".
- `offline-sync`: deleting is one of the changes that work offline; repeated
  delivery and "last change wins" cover deletes.

## Impact

- `pb_public/js/outbox.js` (documented `delete` operation), `sync.js` (send
  it, treat a 404 as done), `view.js` (hide items with a pending delete).
- `pb_public/js/app.js`: delete through the outbox; remove `deleteItem`, the
  `runningDeletes` guard and the online check in the edit row.
- `pb_public/index.html` and `app.css`: remove the `.edit-hint` paragraph and
  its style.
- Tests: unit tests for sync and view; `tests/e2e/delete.spec.mjs` replaces
  the "unavailable offline" test; new offline delete cases in
  `tests/e2e/offline-sync.spec.mjs`.
- `README.md`: "Deleting needs a connection." and the airplane-mode manual
  check.
- No server, schema or dependency changes; the items `deleteRule` already
  allows every family member to delete.
