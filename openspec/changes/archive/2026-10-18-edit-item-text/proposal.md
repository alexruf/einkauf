# Proposal

## Why

Once an item is on the list, its text cannot be changed. To fix a typo or add
a detail such as "2x" or a brand, a family member has to delete the item and
add it again. That loses who added it, and it is only possible online because
deleting is online-only.

## What Changes

- Each item row gets an edit button next to the delete button. It opens a
  dialog with the current text, where the user can change it and save.
- The rest of the row stays the check-off target, including the item text,
  so checking items off is not harder than before.
- Editing works offline like checking off: the new text shows immediately,
  is marked as not yet synchronized and is sent when the connection returns.
- The same text rules as for adding apply: trimmed, not empty, at most 200
  characters. An empty or unchanged text saves nothing.
- Open and checked-off items can both be edited; editing does not change the
  checked state. Items not yet synchronized can be edited too.
- The server accepts text changes from family members, trims the text and
  records the editor as last editor. **BREAKING** for the API contract: an
  update that changes the text is no longer refused.
- Conflicts follow the existing rule: the change that reaches the server last
  wins. No merge or conflict prompt.
- Out of scope: inline editing in the row, editing by swipe or long-press, an
  edit history.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `shopping-list`: adds editing an item's text; replaces "Only the checked
  state can be changed" with a requirement that allows the checked state and
  the text; live updates and author metadata also cover edits.
- `offline-sync`: editing an item's text is one of the changes that work
  offline and are synchronized like the others.

## Impact

- New migration in `pb_migrations/` that loosens the items `updateRule`; the
  existing migration stays untouched.
- `pb_hooks/items.js`: trim the text on update as well as on create.
- `pb_public/js/outbox.js` (documented operation), `sync.js` (send it, treat
  404 as deleted), `view.js` (apply pending text changes).
- `pb_public/index.html`, `app.js`, `app.css`: edit button, edit dialog,
  focus handling on re-render.
- Tests: API tests in `tests/api/items.test.mjs` (two existing tests that
  expect text changes to be refused must change), unit tests for sync and
  view, a new e2e spec for editing online and offline.
- No new dependencies, no new files in `pb_public/`.
