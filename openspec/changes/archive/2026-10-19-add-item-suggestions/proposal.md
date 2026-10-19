# Proposal

## Why

A family buys the same things again and again, yet every item has to be
typed in full each time, on a phone keyboard and often inside a shop.
Suggestions from what the family bought before cut this to two letters and a
tap. Checked-off items are deleted after 24 hours, so the list itself cannot
serve as that memory; the purchases need their own small, longer-lived record.

## What Changes

- The server keeps a purchase record per item text: the text as last
  written, how often it was bought, and when it was last bought. Texts that
  differ only in upper and lower case count as the same purchase.
- Checking an item off counts one purchase of its current text; un-checking
  it takes that purchase back. A purchase whose count drops to zero is
  removed. Un-checking a text without a purchase record changes nothing.
  Repeated delivery of the same check-off counts once.
- A purchase not bought for 3 months is deleted by the existing hourly
  cleanup.
- While the user types at least 2 characters into the add field, up to 5
  matching past purchases are shown below it. Matches at the start of a word
  come before matches inside a word, each group ordered by how often it was
  bought.
- Tapping a suggestion adds it to the list at once, clears the field and
  keeps the keyboard open. On a keyboard, arrow keys select a suggestion and
  Enter adds it; without a selection, Enter adds the typed text as before.
- A suggestion whose text is already an open item is shown greyed out with
  "steht schon drauf" and cannot be chosen.
- Suggestions also work offline, from the purchases loaded with the last
  synchronization.
- Family members can read purchases but not change them through the API;
  the administrator can edit or delete them in the admin UI.
- Out of scope: removing a suggestion in the app, a quantity field,
  separating quantities from text ("Milch 2x" is its own suggestion), a
  "recently bought" list without typing, and importing existing items.

## Capabilities

### New Capabilities

- `item-suggestions`: the family's purchase history (how check-offs are
  counted and when purchases expire) and the suggestions shown while adding
  an item.

### Modified Capabilities

_None._ Checking off, the 24-hour cleanup and offline synchronization keep
their current requirements; purchases are recorded alongside them.

## Impact

- New migration in `pb_migrations/` creating the `purchases` collection
  (read for family members, no API writes, unique lowercase key).
- `pb_hooks/items.pb.js` and `pb_hooks/items.js`: count and take back
  purchases on check-off transitions; `pb_hooks/cleanup.pb.js`: expire old
  purchases, also through the existing manual cleanup route.
- `pb_public/js/sync.js`: load purchases into the snapshot on reload; a new
  DOM-free module `pb_public/js/suggest.js` for matching and ranking, added
  to `SHELL` in `sw.js`.
- `pb_public/index.html`, `app.css`, `js/app.js`: suggestion list below the
  add field, keyboard handling, combobox semantics.
- Tests: API tests for counting, permissions and expiry; unit tests for
  `suggest.js` and the snapshot; a new e2e spec for suggestions.
- `README.md`: describe suggestions and the admin fallback for unwanted ones.
- No new dependencies.
