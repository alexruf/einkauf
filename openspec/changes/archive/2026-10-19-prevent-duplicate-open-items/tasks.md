# Tasks

## 1. Duplicate lookup

- [x] 1.1 Write failing unit tests in `tests/unit/suggest.test.mjs` for `findOpenItem(items, text, exceptId)`: finds "Milch" for "milch " and for "MILCH" with repeated inner spaces normalized; returns `undefined` for "Milch 2x", for an empty list and when the only match is `exceptId`; returns the item object so its `id` and `text` can be used; verify they fail because the export is missing
- [x] 1.2 Implement `findOpenItem` in `pb_public/js/suggest.js` next to `normalize`, and widen the module's header comment to cover it; verify the tests from 1.1 and the rest of `tests/unit/` pass

## 2. Adding an item already on the list

- [x] 2.1 Write a failing e2e spec `tests/e2e/duplicates.spec.mjs` for adding: with an open "Milch", entering "milch " adds nothing, empties the field, keeps the focus, gives the row "Milch" the class `is-highlighted` and shows "„Milch“ steht schon drauf." in the status; the highlight is gone after about 2 seconds; a checked-off "Brot" does not block adding "Brot"; "Milch 2x" is added; with many open items, the row is scrolled into view; after `goOffline`, adding "Käse" twice gives one row; verify it fails
- [x] 2.2 Add the `is-highlighted` row style to `pb_public/app.css` with the `--notice` background and a short fade, no transition under `prefers-reduced-motion: reduce`, following `docs/design.md`; keep the claim stripe visible
- [x] 2.3 In `pb_public/js/app.js`, add the highlight state (`highlighted` with a 2-second timer, applied in `rowElement`, cleared with a re-render) and a helper that highlights a row and calls `showNotice`; in the add form submit, look up the open rows of `currentRows(user)` with `findOpenItem` before `addItem`, and on a match highlight and scroll the row into view instead of adding; verify the e2e spec from 2.1 passes

## 3. Editing an item into one already on the list

- [x] 3.1 Add failing e2e tests to `tests/e2e/duplicates.spec.mjs` for editing: editing open "Brot" to "MILCH" with an open "Milch" saves nothing, the edit row stays open with "MILCH" and focus, the row "Milch" is highlighted and the status shows "„Milch“ steht schon drauf."; editing "milch" to "Milch" saves; editing open "Brötchen" to a checked-off "Brot" saves; editing checked-off "Milch 2x" to open "Milch" saves; verify the duplicate case fails
- [x] 3.2 In `saveEdit` in `pb_public/js/app.js`, when the edited row is open, look up the other open rows with `findOpenItem` (skipping the edited id) before closing the edit mode; on a match keep the edit mode, focus and draft, highlight the other row without scrolling and show the notice; verify the tests from 3.1 and `tests/e2e/edit.spec.mjs` pass

## 4. Documentation and integration

- [x] 4.1 Update `README.md` ("How the app works"): adding or editing an item into the text of an open item points at the existing row instead of creating a second one; check `docs/design.md` for a place that names row states or the `--notice` role and add the highlight there if so; verify each statement against the code
- [x] 4.2 Run `make fmt` and `make test` and verify that lint, unit, API and e2e suites all pass

## Workflow follow-up

- Check on a phone that after adding a duplicate the keyboard stays open and the highlighted row is visible below the sticky add field.
- Archive the change with `/opsx:archive` (sync specs) before committing, and remove "Duplicate items when typing the full text" from `docs/ideas.md` in the same commit.
