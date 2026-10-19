# Tasks

## 1. Outbox, sync and view

- [x] 1.1 Write failing unit tests in `tests/unit/sync.test.mjs`: a pending `delete` is sent as a delete of that id and leaves the outbox; a `delete` answered with 404 counts as done without `onRejected` and the rest is sent; a `delete` that fails offline stays in the outbox and stops the flush; a pending `create` followed by a `delete` sends both in that order; verify the new tests fail
- [x] 1.2 Support `delete` in `pb_public/js/sync.js` (`send`, and 404 as done in `classify`) and document the operation in the header comment of `pb_public/js/outbox.js`; verify the tests from 1.1 and the existing sync tests pass
- [x] 1.3 Write failing unit tests in `tests/unit/view.test.mjs`: a pending `delete` hides an item from the snapshot; it hides an item from a pending `create`; it keeps hiding the item when the snapshot still contains it; a later `setChecked` for a deleted id is not shown; verify the new tests fail
- [x] 1.4 Apply `delete` in `buildRows` (`pb_public/js/view.js`); verify the tests from 1.3 and the existing view tests pass

## 2. Delete button through the outbox

- [x] 2.1 In `tests/e2e/delete.spec.mjs`, replace the "unavailable offline" test with failing tests: offline (via `goOffline`), Anna deletes "Käse", it disappears for her at once while Ben still sees it, the sync indicator shows a pending change, and after `goOnline` it is gone for both; the delete button is enabled for an item added offline, and deleting it leaves the item in nobody's list after reconnecting; verify they fail
- [x] 2.2 In `pb_public/js/app.js`, make the delete button close the edit mode and add a `delete` operation, then render and flush; remove `deleteItem`, `runningDeletes` and its check in `reloadIfIdle`, and the disabled state and hint handling in `editRowElement`; remove the `.edit-hint` paragraph from `pb_public/index.html` and its rule from `pb_public/app.css`; verify `tests/e2e/delete.spec.mjs`, `edit.spec.mjs` and `update.spec.mjs` pass
- [x] 2.3 Add failing-then-passing e2e tests in `tests/e2e/offline-sync.spec.mjs`: a delete made offline stays hidden after reloading the page offline and is synchronized after `goOnline`; Anna deletes "Milch" offline, Ben then edits it online, and after Anna reconnects nobody sees it; the logout question with one pending delete says "1 Änderung ist noch nicht übertragen …"; verify they pass
- [x] 2.4 Update `README.md`: drop "Deleting needs a connection." from "How the app works" and change the airplane-mode manual check so deleting works offline; check `AGENTS.md` and `docs/design.md` for statements that deleting is online-only; verify each change against the code

## 3. Integration

- [x] 3.1 Run `make fmt` and `make test` and verify that lint, unit, API and e2e suites all pass

## Workflow follow-up

- Deploy, then check on a phone in airplane mode that deleting works and syncs after reconnecting.
- Archive the change with `/opsx:archive` (sync specs) before committing, so code, main specs and the archived change land in one commit.
