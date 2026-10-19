# Tasks

## 1. Purchases on the server

- [x] 1.1 Write a failing API test file `tests/api/purchases.test.mjs`: a family member can list purchases, an anonymous client receives none, and create, update and delete by a family member are refused; verify it fails because the collection does not exist
- [x] 1.2 Add a new migration in `pb_migrations/` that creates `purchases` (`key` unique, `text`, `count` integer min 0, `lastAt` date; list/view for family members, no API writes) with a down migration that deletes it; verify the tests from 1.1 pass and, on a local `pb_data/`, that `migrate down 1` and `migrate up` work
- [x] 1.3 Add failing API tests for counting: first check-off creates count 1; a later check-off of "milch" raises the count and shows "milch"; adding and editing without check-off counts nothing; an edited text is counted under the new text; sending the same check-off twice counts once; un-checking a mistaken first check-off removes the purchase; un-checking a frequent purchase lowers the count by one; un-checking a text without a purchase changes nothing; superuser updates count nothing; verify they fail
- [x] 1.4 Add `pb_hooks/purchases.js` (key normalization, `recordPurchase`, `takeBackPurchase`) and call it from `onRecordUpdateRequest` in `pb_hooks/items.pb.js` after `e.next()`, wrapped so a failure is logged and the update still succeeds; verify the tests from 1.3 and all existing API tests pass
- [x] 1.5 Add failing API tests in `tests/api/cleanup.test.mjs`: a purchase with `lastAt` older than 90 days is deleted by the cleanup route and reported as `expired`, a recent one remains; then add `expirePurchases` to `pb_hooks/purchases.js` and call it from the cron and the route in `pb_hooks/cleanup.pb.js`; verify the tests pass

## 2. Suggestions logic

- [x] 2.1 Write failing unit tests `tests/unit/suggest.test.mjs` for `suggest(purchases, query, openTexts)`: fewer than 2 characters gives none; word-start matches come before inner matches ("mi" gives Milch, Mineralwasser, Hafermilch for counts 14, 3, 5); hyphenated words count as word starts; ties sort alphabetically; at most 5; case and surrounding or repeated spaces are ignored; "Milch 2x" is not the same as "Milch"; an open item marks the suggestion `onList`, a missing one does not; verify they fail
- [x] 2.2 Implement `pb_public/js/suggest.js` and add it to `SHELL` in `pb_public/sw.js`; verify the tests from 2.1 and the service worker shell test pass
- [x] 2.3 Write failing unit tests in `tests/unit/sync.test.mjs`: a reload stores purchases with `id`, `text` and `count` in the snapshot, and realtime item events keep them; extend the fake client with a `purchases` collection; then load purchases in `reload()` in `pb_public/js/sync.js`; verify the sync tests pass

- [x] 2.4 Decouple loading purchases from the list reload in `pb_public/js/sync.js`: store items and users first, then load purchases in the background, keep the old ones on failure without any notice, start no second request while one runs, and store nothing after logout; verify with unit tests for network, server and 404 failures, a slow response, and logout while loading, plus an e2e test that aborts the purchases request while the list still synchronizes

## 3. Suggestion list in the app

- [x] 3.1 Write a failing e2e spec `tests/e2e/suggestions.spec.mjs`: after Anna checks off "Milch", typing "mi" suggests it; one character suggests nothing; tapping a suggestion adds the item, empties the field and keeps the focus; submitting "Milch 2x" adds the typed text; an open "Milch" is shown with "steht schon drauf" and tapping it adds nothing; down arrow plus Enter adds the first suggestion; Escape hides the list and keeps the text; suggestions appear offline (via `goOffline`) and after a reload offline; Ben sees Anna's first purchase of "Kaffee" after his next synchronization; verify it fails
- [x] 3.2 Add the combobox attributes to `#new-item` and the `#suggestions` listbox to `pb_public/index.html`, and its styles to `pb_public/app.css` using tokens from `:root` and following `docs/design.md`, with a disabled style and the "steht schon drauf" note
- [x] 3.3 Wire the list in `pb_public/js/app.js`: recompute on `input` and in `render()` while open; option `pointerdown` keeps the focus, `click` adds through `addItem` and clears the field; arrow keys, Enter and Escape as in design.md; hide on blur and submit; verify the e2e spec from 3.1 passes
- [x] 3.4 Check the list on a 360 px wide phone in the e2e spec: options are tap targets of at least 44 px and stay inside the screen; verify the check passes, and that the CSP and layout e2e specs still pass

## 4. Documentation and integration

- [x] 4.1 Update `README.md` ("How the app works"): suggestions while typing, how purchases are counted and expire, and that unwanted suggestions are edited or deleted in the admin UI (collection **purchases**); update the "Schema changes" or admin sections if they list collections; check `AGENTS.md` for the hook file list under "Server logic" and add `pb_hooks/purchases.js`; verify each statement against the code
- [x] 4.2 Run `make fmt` and `make test` and verify that lint, unit, API and e2e suites all pass

## Workflow follow-up

- Deploy, then check on a phone that tapping a suggestion keeps the keyboard open and the list does not hide the field.
- Archive the change with `/opsx:archive` (sync specs) before committing, so code, main specs and the archived change land in one commit.
