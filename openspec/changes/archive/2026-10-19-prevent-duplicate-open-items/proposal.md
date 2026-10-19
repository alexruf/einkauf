# Proposal

## Why

The suggestions already refuse a past purchase that is open on the list and
mark it "steht schon drauf". Someone who types the whole text and submits it,
or edits an item into the text of another one, still ends up with the same
item twice on the open list. Two "Milch" rows get bought twice or confuse
whoever is in the shop. The app knows the open items, so it can point at the
existing row instead.

## What Changes

- Adding an item whose text equals an open item, ignoring upper and lower
  case and extra spaces, adds nothing. The add field is cleared and keeps the
  focus, the existing row is scrolled into view and briefly highlighted, and
  the status bar says that the item is already on the list.
- Saving an edit whose text equals another open item saves nothing. The row
  stays in edit mode with the typed text, the other row is briefly
  highlighted, and the status bar says the same.
- Checked-off items never count as duplicates, and an item may be edited to
  a spelling of its own text that differs only in case.
- The check runs in the app against the list it shows, including items that
  are not synchronized yet, so it also works offline.
- Out of scope: duplicates created by two devices at the same time or while
  one is offline, un-checking an item whose text is open again, merging
  existing duplicates, a server-side uniqueness rule, and treating "Milch"
  and "Milch 2x" as the same item.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `shopping-list`: a new requirement that adding or editing does not create
  a second open item with the same text, and how the existing item is shown
  instead.

## Impact

- `pb_public/js/suggest.js`: a DOM-free function that finds the open item
  with the same normalized text, next to `normalize`, with unit tests.
- `pb_public/js/app.js`: the add form submit and `saveEdit` use it; a
  short-lived highlight state that survives re-renders; the existing
  `showNotice` for the message.
- `pb_public/app.css`: a highlight style for a row, using an existing token,
  without motion when reduced motion is requested.
- Tests: unit tests in `tests/unit/suggest.test.mjs`; e2e tests for adding
  and editing.
- `README.md` and `docs/design.md` if they describe adding or the row
  states; remove the idea from `docs/ideas.md` when archived.
- No server, schema or dependency changes.
