# Proposal

## Why

Today a quantity or a hint is part of an item's text ("Milch 2x", "Joghurt,
die laktosefreie"). Each variant then becomes its own purchase and its own
suggestion, and "Milch" and "Milch 2x" are not recognized as the same item
on the list. Keeping the note in a separate field leaves the text clean for
purchases, suggestions and duplicate detection, and for categories later.

## What Changes

- Items get an optional note, stored separately from the text. It is
  trimmed, may be empty and holds at most 200 characters.
- Adding stays a single field. The text ends at the first `;`, or at the
  first `,` that does not stand between two digits, whichever comes first;
  the rest, trimmed, is the note. "Milch, 2x" and "Sahne; 0,5" split, while
  the decimal comma in "Sahne 0,5 l" does not.
- The edit mode shows two fields, one for the text and one for the note.
  Neither splits. The note can be changed or cleared there.
- A row shows the note after the text, muted and separated by a middle dot
  ("Milch · 2x"). It wraps with the text instead of being cut off, and
  checking off strikes through text and note in one line.
- Only the text counts for purchases, suggestions and duplicate detection.
  Adding "Milch, 2x" while "Milch" is open adds nothing and points at the
  existing row, as adding "Milch" does today; the typed note is not kept.
- Suggestions filter on the part before the separator, and choosing one
  adds the suggestion's text with the typed note.
- Notes can be added and edited offline like everything else.
- Out of scope: a numeric quantity or +/- buttons, merging a typed note into
  an existing item, splitting on the server, remembering notes in
  purchases, and cleaning up existing items or purchases whose text
  contains a quantity. Those expire on their own.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `shopping-list`: items have a note; adding splits the typed text into
  text and note; the edit mode has a note field; the row shows the note and
  the strike-through covers it; the API allows changing the note; the
  duplicate checks compare only the text.
- `item-suggestions`: the note is not part of a purchase; suggestions match
  the text before the separator; choosing a suggestion keeps the typed note.
- `offline-sync`: notes can be added and edited offline.

## Impact

- `pb_migrations/`: a new migration adding the `note` text field (max 200)
  to `items`.
- `pb_hooks/items.js`: `applyMemberWrite` trims the note. Purchases keep
  using the text only, so `pb_hooks/purchases.js` does not change.
- `pb_public/js/`: a new DOM-free module that splits the typed text, with
  unit tests and a `SHELL` entry in `sw.js`; `outbox.js`, `sync.js` and
  `view.js` carry the note and a new `setNote` operation; `app.js` wires
  the add field, suggestions, the edit mode's second field and the row's
  note.
- `pb_public/index.html` and `pb_public/app.css`: the note in the row
  template and the edit template, styled with existing tokens.
- Tests: unit tests for splitting, rows, outbox and sync; API tests for the
  note field; e2e tests for adding, editing, suggestions, duplicates,
  offline and layout.
- Docs: `README.md` ("How the app works"), `docs/design.md` (the note in a
  row), the module list in `AGENTS.md`; remove the idea from
  `docs/ideas.md` when archived.
- Compatibility: an app still running the cached old version keeps sending
  only the text, and its typed separators stay in the text until it
  updates. The server accepts both. No new dependency.
