# Tasks

## 1. Server accepts text changes

- [x] 1.1 Change the two API tests in `tests/api/items.test.mjs` that expect a text update to be refused: a text-only update now stores the new text, and an update with `checked` and `text` together stores both; add failing tests that an update to " Käse " stores "Käse", an update to "   " or to 201 characters is refused and keeps the text, a text update sets `updatedBy` to the editor and keeps `createdBy`, and a forged `createdBy` on update is ignored; verify the new and changed tests fail
- [x] 1.2 Add a new migration in `pb_migrations/` that sets the items `updateRule` to the family-member check alone, with a down migration that restores `@request.body.text:isset = false`; leave the existing migration untouched
- [x] 1.3 Trim the text on update as well as on create in `applyMemberWrite` (`pb_hooks/items.js`); verify the tests from 1.1 pass and, if the whitespace-only update is not refused by field validation, refuse it in the hook and record that in design.md
- [x] 1.4 Verify by hand on a local `pb_data/` that `migrate down 1` restores the strict rule and `migrate up` loosens it again

## 2. Outbox, sync and view

- [x] 2.1 Write failing unit tests in `tests/unit/sync.test.mjs`: a pending `setText` is sent as an update with only `text`, a `setText` for an item that returns 404 is dropped quietly and the rest is sent, and one that returns 400 is dropped with `onRejected`
- [x] 2.2 Support `setText` in `pb_public/js/sync.js` (`send` and `classify`) and document the operation in the header comment of `pb_public/js/outbox.js`; verify the tests from 2.1 and the existing sync tests pass
- [x] 2.3 Write failing unit tests in `tests/unit/view.test.mjs`: a pending `setText` shows the new text, pending, with me as last editor; it keeps the checked state; it applies on top of a pending `create`; and one for an item no longer on the server is not shown
- [x] 2.4 Apply `setText` in `buildRows` (`pb_public/js/view.js`); verify the tests from 2.3 and the existing view tests pass

## 3. Edit button and dialog

- [x] 3.1 Write a failing e2e spec `tests/e2e/edit.spec.mjs`: Anna edits "Milch" to "Hafermilch" and Ben sees it with Anna as last editor; editing a checked-off item keeps it checked; cancelling, and saving an empty or unchanged text, keep the text; Enter saves; tapping the item text checks it off and opens no dialog; editing while offline (via `goOffline`) shows the new text as not synchronized, and after `goOnline` Ben sees it; the dialog closes when Ben deletes the item while Anna edits it
- [x] 3.2 Add the edit button (pencil icon, `aria-label="Bearbeiten"`) before the delete button in the item template and the `#edit-item` dialog in `pb_public/index.html`; style `.edit` like `.delete` in `pb_public/app.css`
- [x] 3.3 Wire the button in `pb_public/js/app.js`: open the dialog with the row's current text, and on "Speichern" add a `setText` only for a non-empty, changed, trimmed text, then render and flush; close the dialog in `render()` when its item is gone; restore focus to `.edit` after a re-render; verify the e2e spec from 3.1 passes
- [x] 3.4 Verify on a narrow viewport (375px) in the existing layout e2e test, or by a check in 3.1, that the row does not overflow and the check-off label still fills the remaining width

## 4. Documentation and integration

- [x] 4.1 Check `README.md` and `AGENTS.md` for statements that item text cannot be changed or that only the checked state syncs offline, and update them; verify each change by reading the matching code
- [x] 4.2 Run `make test` and verify that the unit, API and e2e suites all pass

## Workflow follow-up

- Deploy, then check on a phone that editing works and checking off by tapping the text still feels the same (ties in with the pending phone design check).
- Archive the change with `/opsx:archive` (sync specs) before committing, so code, main specs and the archived change land in one commit.
