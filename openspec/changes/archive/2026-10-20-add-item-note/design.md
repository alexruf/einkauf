# Design

## Context

See proposal.md for the motivation and the delta specs for the
requirements.

The current state that shapes the approach:

- An item is `{ text, checked, checkedAt, createdBy, updatedBy, claimedBy,
  claimedAt }`. The `items` update rule only checks for a family member;
  `applyMemberWrite` in `pb_hooks/items.js` overwrites what clients must
  not set and trims the text. Any new plain field is therefore writable
  without a rule change.
- Purchases are keyed by `purchaseKey(text)` in `pb_hooks/purchases.js`,
  and the update hook passes only the text to `recordCheckChange`.
- Every write goes through the outbox as one small operation that is safe
  to send twice: `create`, `setChecked`, `setText`, `setClaimed`, `delete`.
  `sync.js` sends each one as a partial update, so a text change never
  overwrites a check-off made elsewhere. `buildRows` in `view.js` lays the
  pending operations over the snapshot. `ITEM_FIELDS` decides which fields
  reach the snapshot, from reloads and from realtime events.
- The add field is one `<input maxlength="200">`. `updateSuggestions`,
  `chooseSuggestion` and the add form submit each read `input.value`
  directly.
- The edit mode keeps `editing = { id, draft, selection, focused }` for a
  single field, so a re-render can rebuild the row without losing what was
  typed. `saveEdit(value)` runs the duplicate check, then `setText`.
- The strike-through is a background gradient on the inline `.text` span.
  That is why it already continues across line breaks.
- New files in `pb_public/` must be listed in `SHELL` in `sw.js`, and a
  test enforces it.

## Goals / Non-Goals

**Goals:**
- Splitting the add field's entry is a pure function with table-driven
  unit tests. `app.js` only calls it.
- The note follows the same paths as the text: outbox, snapshot, realtime,
  rows. There is no special case for "item with note".
- A note change and a text change are separate partial updates, so two
  people editing different fields of the same item both keep their change.

**Non-Goals:**
- Any server-side splitting or normalization beyond trimming.
- Changing purchases, their key or their stored data.
- Migrating existing texts like "Milch 2x" into text and note.

## Decisions

### Data model: a plain `note` text field, max 200

A new migration adds `new TextField({ name: "note", max: 200 })` to
`items`, the same way the claims migration added its fields. Its down
migration removes the field. It is not required, so existing records read
as an empty note. `applyMemberWrite` trims it next to the text. On an
update that does not send a note, `getString("note")` returns the stored
value and trimming changes nothing.

The maximum is 200, the same as the text, rather than the 100 discussed
earlier. The add field keeps `maxlength="200"` for the whole entry, so
neither part can ever exceed its limit and the add flow needs no length
check or error message. Both edit fields get `maxlength="200"`.

Alternative: a numeric `quantity` plus a `note`. Rejected because nothing
uses a number today, and free text covers "2x", "500 g" and "die
laktosefreie" alike.

### Splitting: `splitEntry(value)` in a new `pb_public/js/entry.js`

`splitEntry` returns `{ text, note }`. It walks the string once and stops
at the first `;`, or at the first `,` that does not have a digit on both
sides. Both parts are trimmed. Without a separator, the whole entry is the
text and the note is `''`. The same holds when only spaces stand before the
first separator, as in ";2x" or ",Milch". An item needs a text, and a note
without one makes no sense, so the entry is kept whole instead of being
refused. It is a new module, because splitting typed
input is a different job from ranking purchases in `suggest.js`. That
costs one `SHELL` entry and one line in the module list in `AGENTS.md`.

Only the add field uses it, in three places:

- the add form submit: `findOpenItem(openRows, text)`, then
  `addItem(text, note)`;
- `updateSuggestions`: `suggest(purchases, splitEntry(input.value).text,
  openTexts)`;
- `chooseSuggestion`: `addItem(suggestion.text,
  splitEntry(input.value).note)`.

Alternative: a regular expression. Rejected, because the digit-on-both-
sides condition is easier to read as a loop, and the loop states the
first-match rule directly.

### Outbox: `create` carries the note, a new `setNote` changes it

- `{ type: 'create', id, text, note }`. Entries stored by the old version
  have no `note`, so readers use `op.note ?? ''`.
- `{ type: 'setNote', id, note }` holds the whole new note; `''` clears it.

`sync.js` sends `create` with `{ id, text, note }` and `setNote` as
`update(id, { note })`. `classify` treats a 404 for `setNote` like one for
`setText`: the item is gone and the change is dropped. `ITEM_FIELDS` gains
`note`. `buildRows` sets `note` on created rows, applies `setNote` like
`setText`, and returns `note` on every row, defaulting to `''` for
snapshot items stored before this change.

Alternative: widen `setText` to `{ text?, note? }`. Rejected, because an
operation that sends both fields would overwrite a text change made
elsewhere when only the note was edited. That breaks the "Text and note
changed on different devices" scenario, and it makes every reader of
`setText` handle optional fields.

### Edit mode: two fields, one draft object

The edit template gets a second input, `.edit-note`, below `.edit-text`,
with `placeholder="Menge oder Hinweis"`, `aria-label="Menge oder Hinweis"`,
`maxlength="200"` and `enterkeyhint="done"`. Both sit in the existing
`.edit-form`, so Enter in either field submits the form and the row's
Escape handler covers both.

`editing` becomes `{ id, draft: { text, note }, focus }`, where `focus` is
`{ field: 'text' | 'note', selection }` or `null`. `rememberEditField`
reads both inputs and which one has focus. `restoreEditField` focuses that
one with its selection. Opening still focuses the text field with the
cursor at the end.

`saveEdit({ text, note })` keeps the order it has today. First the
duplicate check runs on the text only, and on a match nothing is saved and
both drafts stay. Then it closes the edit mode, calls `setText` and then
`setNote`. Each compares with the row as shown now and adds an operation
only if its value changed, so saving without changes leaves the last editor
as it is. An empty text field still keeps the text. An empty note field
clears the note.

### Row: the note inside `.text`

`rowElement` builds `.text` as the item text, a space, and a
`<span class="note">` whose `textContent` is `· ` followed by the
note. The span is only added for a non-empty note. Because the note is a
child of `.text`, the single background line of the strike-through runs
across text and note in one stroke and continues across line breaks. A
separate sibling span would need its own animation, timed to start after
the text's.

The normal space before the dot lets a long entry break before the note.
The non-breaking space after it keeps the dot from ending a line on its
own. `.note` takes `color: var(--muted)`, an existing token. In a checked
row both parts are muted, and the dot keeps them apart. All values come
through `textContent`, as the CSP requires.

Suggestions keep showing only purchase texts, so the suggestion markup does
not change.

## Risks / Trade-offs

- [A text that really contains a comma, like "Salz, Pfeffer", becomes text
  "Salz" with note "Pfeffer"] → The edit mode fixes it, because its fields
  do not split. The family decided the convention is worth that.
- [One save that changes text and note creates two pending operations, so
  offline the indicator and the logout question count 2 changes] → This
  is accurate in what it sends. A combined operation would lose concurrent
  edits.
- [A typed note is discarded when the text is already open] → This is
  intended. The existing row is highlighted, and the note can be added in
  its edit mode.
- [An app still running the old cached version] → It sends no note and
  ignores notes it receives, so its rows show only the text until the
  update check reloads it. Its separators stay in the text. Nothing breaks
  on the server.
- [Existing purchases like "Milch 2x" keep being suggested] → They expire
  after three months without a check-off, or the administrator deletes
  them.

## Migration Plan

The new migration runs when the server starts with the new release, as the
claims migration did. Production deploys by checking out the tag. Rolling
back the code without the down migration is safe: the old app does not
read `note`, and the field simply stays in the database. The down
migration removes the field and all notes with it, so it is a deliberate
step and is not part of a normal rollback.
