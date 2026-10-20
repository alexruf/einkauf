# Tasks

## 1. Note field on the server

- [x] 1.1 Write failing API tests in `tests/api/items.test.mjs` and `tests/api/item-metadata.test.mjs`: creating an item with the note "2x" stores it; creating without a note stores `''`; a note of 200 characters is stored and one of 201 is refused on create and on update; an update sending only `{ note: "2x" }` keeps the text and checked state; " 2x " is stored as "2x" on create and on update; Ben changing only the note of Anna's item makes Ben last editor and keeps Anna as creator. Verify they fail because the field is missing
- [x] 1.2 Add `pb_migrations/1792265300_add_item_note.js`, which adds `new TextField({ name: "note", max: 200 })` to `items` and removes it in the down migration, following `1792265000_add_item_claims.js`. Check `TextField` and `fields.add`/`removeByName` against `pb_data/types.d.ts`. In `applyMemberWrite` in `pb_hooks/items.js`, trim the note next to the text and widen its comment. Verify the tests from 1.1 pass
- [x] 1.3 Add an API test to `tests/api/purchases.test.mjs`: with "Milch" bought 3 times, checking off an item with the text "Milch" and the note "2x" makes the count 4, and no purchase with key "milch 2x" or "2x" exists. Verify it passes without changing `pb_hooks/purchases.js`, and that the rest of `tests/api/` passes

## 2. Splitting the add field's entry

- [x] 2.1 Write failing table-driven unit tests in `tests/unit/entry.test.mjs` for `splitEntry(value)`, covering every case in the "A note is typed after a separator" requirement: "Milch, 2x", "Sahne; 0,5", "Sahne, 0,5", "Sahne 0,5 l", "Sahne 0,5; Bio", "Eier 10, Bio", "Joghurt; Erdbeer, Bio", "Milch,", ";2x" and ",Milch" (kept whole as the text), plus "Milch 2x" without a separator, surrounding spaces in both parts, "1,5" at the very start and a comma at the end after a digit ("Eier 10,"). Verify they fail because the module is missing
- [x] 2.2 Implement `splitEntry` in a new `pb_public/js/entry.js` with a header comment in the style of the other modules. Add `/js/entry.js` to `SHELL` in `pb_public/sw.js` and `entry` to the DOM-free module list in `AGENTS.md`. Verify the tests from 2.1, the `SHELL` test and the rest of `tests/unit/` pass

## 3. Note in the outbox, sync and rows

- [x] 3.1 Write failing unit tests in `tests/unit/view.test.mjs`: a pending create with a note gives a row with that note; a pending `setNote` changes only the note, marks the row pending and makes me last editor; a snapshot item without a `note` field and a pending create without `note` both give `note: ''`; a `setNote` for an item missing from the snapshot shows nothing. Verify they fail
- [x] 3.2 Write failing unit tests in `tests/unit/sync.test.mjs`: a pending create sends `{ id, text, note }`; a pending `setNote` sends only `{ note }` and stores the confirmed note in the snapshot; a `setNote` for an item deleted on the server is dropped and the rest is sent; reloads and realtime events keep `note` in the snapshot. Verify they fail
- [x] 3.3 Implement the note in `buildRows` (`pb_public/js/view.js`) and in `send`, `classify` and `ITEM_FIELDS` (`pb_public/js/sync.js`). Document `create` with `note` and the new `setNote` operation in the header comment of `pb_public/js/outbox.js`. Verify the tests from 3.1 and 3.2 and the rest of `tests/unit/` pass

## 4. Showing the note in a row

- [x] 4.1 Write failing e2e tests in `tests/e2e/list.spec.mjs` for an item created through the API with the text "Milch" and the note "2x": both users see "Milch · 2x", with the `.note` inside `.text` in the muted color; an item without a note has no `.note` and no middle dot; a note with markup appears literally and no script runs; checking off "Milch · 2x" keeps the note in the "Erledigt" row inside the struck `.text`. Add a test to `tests/e2e/layout.spec.mjs`: at 360 px, a row with a 200-character note shows the whole note on several lines and nothing scrolls horizontally. Verify they fail
- [x] 4.2 In `rowElement` in `pb_public/js/app.js`, append a space and a `.note` span with `·`, a non-breaking space and the note, through `textContent`, only for a non-empty note. Add the `.note` style with `var(--muted)` to `pb_public/app.css`. Add notes to the `--muted` row of the token table in `docs/design.md` and describe the note after the text there. Verify the tests from 4.1 and `tests/e2e/animation.spec.mjs` pass

## 5. Adding an entry with a note

- [x] 5.1 Write failing e2e tests in `tests/e2e/list.spec.mjs`: entering "Milch, 2x" adds text "Milch" with note "2x" for both users; "Sahne 0,5 l" adds one item without a note; ";2x" adds an item with the text ";2x" and no note. Add tests to `tests/e2e/duplicates.spec.mjs`: with an open "Milch", entering "Milch, 2x" adds nothing, empties the field, highlights "Milch" and leaves it without a note; with an open "Milch · 2x", entering "milch" adds nothing and highlights it. Verify they fail
- [x] 5.2 In the add form submit in `pb_public/js/app.js`, split the entry with `splitEntry`, run `findOpenItem` on the text part, and pass the note to `addItem(text, note)`, which puts it into the `create` operation. Verify the tests from 5.1 and the rest of `tests/e2e/duplicates.spec.mjs` pass

## 6. Suggestions with a typed note

- [x] 6.1 Write failing e2e tests in `tests/e2e/suggestions.spec.mjs`: with "Milch" bought, typing "milch, 2" suggests "Milch"; typing "mi; 2x" and tapping "Milch" adds "Milch · 2x" and empties the field; typing "mi, 2x", pressing the down arrow and Enter adds the first suggestion with the note "2x"; with an open "Milch · 2x", typing "mi" shows "Milch" greyed out with "steht schon drauf". Verify the ones that need the change fail
- [x] 6.2 In `updateSuggestions` and `chooseSuggestion` in `pb_public/js/app.js`, use `splitEntry(input.value).text` as the query and add the chosen suggestion with `splitEntry(input.value).note`. Verify the tests from 6.1 and the rest of `tests/e2e/suggestions.spec.mjs` pass

## 7. Editing the note

- [x] 7.1 Write failing e2e tests in `tests/e2e/edit.spec.mjs`: opening "Milch · 2x" shows "Milch" and "2x" in two fields, the note field showing "Menge oder Hinweis" when empty, and the text field focused with the cursor at the end; Ben adding the note "2x" to Anna's "Milch" shows "Milch · 2x" to both, with Ben as last editor; clearing the note removes it; "Joghurt, laktosefrei" in the text field is saved as the text; an empty text field with the note "2x" keeps "Milch" and saves the note; saving unchanged keeps the last editor; Enter in the note field saves; a checked-off "Brot" gets the note "Vollkorn" and stays checked off; while Anna types in the note field and Ben adds "Eier", her changed text, typed note and cursor stay. Add tests to `tests/e2e/duplicates.spec.mjs`: editing "Brot" to "Milch" with the note "1x" while "Milch · 2x" is open saves nothing, keeps both drafts and highlights "Milch · 2x"; adding a note to the open "Milch" saves. Verify they fail
- [x] 7.2 Add the `.edit-note` input to the edit template in `pb_public/index.html`, with `maxlength="200"`, `autocomplete="off"`, `enterkeyhint="done"`, a placeholder and an aria-label "Menge oder Hinweis", and style it like `.edit-text` in `pb_public/app.css`. In `pb_public/js/app.js`, change `editing` to `{ id, draft: { text, note }, focus }`, update `openEdit`, `editRowElement`, `rememberEditField` and `restoreEditField` to match, make `saveEdit` take both values (duplicate check on the text, then `setText` and a new `setNote` that adds an operation only if the note changed), and keep `reloadIfIdle` aware of the edit mode as today. Verify the tests from 7.1 and the rest of `tests/e2e/edit.spec.mjs` pass
- [x] 7.3 Extend the edit-mode layout test in `tests/e2e/layout.spec.mjs` so both fields and the buttons fit in the row at each tested width, and add the note field to the keyboard-only test if it walks through the edit mode. Verify `tests/e2e/layout.spec.mjs` passes

## 8. Notes offline

- [x] 8.1 Add e2e tests to `tests/e2e/offline-sync.spec.mjs`, using `goOffline`/`goOnline`: Anna adds "Eier, 10" and changes the note of "Milch" to "2x" while offline, sees "Eier · 10" and "Milch · 2x" marked as not synchronized, and after reconnecting Ben sees both; Anna changes the note of "Milch" to "2x" offline while Ben changes its text to "Hafermilch" online, and after Anna reconnects both see "Hafermilch · 2x". Verify they pass. If one fails, fix the cause in the outbox or sync code from group 3

## 9. Documentation and integration

- [x] 9.1 Update `README.md` ("How the app works"): a note after a comma or semicolon when adding, with the decimal-comma exception; the two fields in the edit mode; and that only the text counts for suggestions, purchases and "steht schon drauf". Verify each statement against the code
- [x] 9.2 Run `make fmt` and `make test`, and verify that lint, unit, API and e2e suites all pass

## Workflow follow-up

- Check on a phone that typing "Milch, 2x" in the add field and in the edit mode feels natural, the note field is reachable above the keyboard, and a long note wraps cleanly.
- Archive the change with `/opsx:archive` (sync specs) before committing. In the same commit, remove "Quantity or note as its own field" from `docs/ideas.md`, and check whether the "Categories or aisle order" idea should mention that texts are now clean.
