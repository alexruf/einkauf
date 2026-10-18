# Tasks

## 1. View logic: meta line and status bar

- [x] 1.1 Write failing unit tests in `tests/unit/view.test.mjs`: checked-off rows get an empty meta, open rows keep "von X · zuletzt Y", claimed rows keep the claim text; `connectionIndicator` returns `false` while online with 0 pending, "Verbunden" while online with pending changes, and "Verbinde …"/"Offline" unchanged
- [x] 1.2 Implement both in `pb_public/js/view.js` (pass the pending count to `connectionIndicator`), adapt the call in `app.js` and hide empty meta lines; verify the tests from 1.1 and all existing view tests pass
- [x] 1.3 Update `tests/e2e/status-bar.spec.mjs` and the meta expectations in `claim.spec.mjs` and `edit.spec.mjs` (a checked-off item shows no meta; the "zuletzt" check uses an open item); verify they pass

## 2. Holding rows in place

- [x] 2.1 Write failing unit tests in `tests/unit/view.test.mjs`: with a held sort key, a checked-off row stays among the open rows in its old position but is shown checked; an un-checked row stays in the checked-off group with its old checked time; without held keys the order is unchanged
- [x] 2.2 Add the held-key argument to `buildRows` and return each row's section separately from its displayed checked state; verify 2.1 and the existing view tests pass
- [x] 2.3 Write failing unit tests `tests/unit/hold.test.mjs` with injected timer functions: a toggle records the previous key and starts the timer; a second toggle of the same item keeps the first key; any toggle restarts the timer; firing clears all keys and calls the release callback once; a pinned item stays held when the timer fires and is released with the normal delay after it is unpinned
- [x] 2.4 Implement `pb_public/js/hold.js`, add it to `SHELL` in `pb_public/sw.js`, and wire it in `app.js` so own check-offs and un-checks are held and released with a re-render after 1.5 s; verify 2.3 passes and the service worker e2e test still passes
- [x] 2.5 Write e2e tests (in `tests/e2e/list.spec.mjs`): a checked-off row stays in place right after the tap and moves below the open items after the hold; check-off and un-check within the hold leaves the row in place; Ben's check-off moves the row on Anna's screen without the hold; verify they pass and fix existing e2e tests that assert the order right after a toggle

## 3. "Erledigt" section and empty state

- [x] 3.1 Write failing unit tests `tests/unit/prefs.test.mjs`: the section is collapsed by default, the open state is remembered, and it survives `store.clear()` (own key, like `app-name.js`)
- [x] 3.2 Implement `pb_public/js/prefs.js` and add it to `SHELL`; verify 3.1 passes
- [x] 3.3 Split the list in `pb_public/index.html` into the open list, the empty state (inline SVG icon, "Alles erledigt. Was wird als Nächstes gebraucht?") and the "Erledigt" section with a header `<button>` (`aria-expanded`, `aria-controls`, "Erledigt (n)", chevron); render rows into both lists in `app.js`, hide the section without checked-off items, toggle and remember the open state
- [x] 3.4 Change the shared row helpers in `tests/support/e2e.mjs` to cover both lists and add a helper that expands the section; adapt existing e2e tests that act on checked-off items; add e2e tests for the count, collapsed default, expanding by click and by keyboard, the remembered state after reload, and the empty state with and without checked-off items; verify all pass

## 4. Edit mode in the row replaces edit and delete buttons

- [x] 4.1 Rewrite `tests/e2e/delete.spec.mjs` and `tests/e2e/edit.spec.mjs` for the edit mode: "Mehr" expands the row with the item's text; saving, Enter, Escape, cancel, empty and unchanged text; opening another row cancels the first; deleting an open or checked-off item needs no further confirmation; "Löschen" is disabled with the online-only hint while offline; tapping the item text still checks it off; verify the tests fail
- [x] 4.2 In `index.html` replace the edit and delete buttons in the item template with a "more" button (three dots, `aria-label="Mehr"`), add an edit-row template (field, trash-can delete button with `aria-label="Löschen"`, "Abbrechen", "Speichern", offline hint) and remove `#edit-item` and `#confirm-delete`; in `app.js` keep the edit state (id, draft, selection, focus), draw the edited row from it in `render()`, save and delete from it, focus the field with the cursor at the end of the text when the edit mode opens (on touch devices too, so the keyboard opens at once) and scroll it into view on focus; verify 4.1 passes
- [x] 4.3 Add e2e tests that typing survives Ben adding an item (draft and cursor kept), that the edited row stays in place in edit mode when Ben checks the item off (pinned in the hold), and that the edit mode closes when Ben deletes the item; make the reload after a new version wait for an open edit mode and extend `update.spec.mjs` accordingly; verify all pass
- [x] 4.4 Verify `claim.spec.mjs` still passes with the claim button now next to "Mehr", and that a checked-off row shows only "Mehr"
- [x] 4.5 Check on the user's iPhone, with PocketBase reachable in the local network (`pocketbase serve --http=0.0.0.0:8090` with the usual dir flags; the Service Worker does not register over plain http, which does not matter here): open the edit mode of a row near the bottom of a long list, tap the field, type and save; the field must stay visible above the keyboard and below the add field

## 5. Logout confirmation as bottom sheet

- [x] 5.1 Style dialogs as bottom sheets below 40rem (full width, rounded top, safe-area padding) and centered above; extend `tests/e2e/layout.spec.mjs` to check that the logout confirmation is anchored to the bottom at 390 px and centered at desktop width; verify it passes together with `account-menu.spec.mjs`

## 6. Animation

- [x] 6.1 In `app.js` compute the layout key (ids in displayed order, sections, open state) and wrap the DOM update in `document.startViewTransition` only when it changed, the API exists, reduced motion is not preferred and the page is visible; give rows and the section header `view-transition-name`s via `element.style`; set a duration of about 200 ms in `app.css`; make sure opening or closing the edit mode does not lose the field's focus through the transition
- [x] 6.2 Add an e2e test with `reducedMotion: 'reduce'` that the new order is shown without a running transition, and verify the CSP e2e test reports no violations with transitions active

## 7. Visual design

- [x] 7.1 Replace the palette in `app.css` with the "Einkaufszettel" tokens from design.md (light and dark, with role comments), add the radius, shadow and type-scale tokens, apply them to the login card, account menu, dialogs and list, and set `background_color` in `manifest.webmanifest`; verify `manifest.spec.mjs` passes
- [x] 7.2 Vendor Atkinson Hyperlegible Next as a Latin-subset variable `woff2` in `pb_public/vendor/` from the official release, keep its OFL license text in the repository, add the file to `SHELL`, declare it with `@font-face` (`font-display: swap`, system fallback stack) and use the type scale (item text 17 px); verify the service worker test passes and an e2e check that the item text's computed font family resolves to the vendored font while offline
- [x] 7.3 Add an e2e check that the meta line, muted text and the status bar text reach at least 4.5:1 contrast against their background in light and dark mode (Playwright `colorScheme`), computed from the rendered colors
- [x] 7.4 Draw the custom checkbox (26 px, 8 px radius, `appearance: none`, border, accent fill with `data:` SVG check mark per color scheme, visible focus ring) and inset the row separators to start at the text; verify in the e2e layout test that the checkbox is still reachable by role and toggles
- [x] 7.5 Add the strike-through: a background-gradient line on the item text drawn from 0 to 100 % only for rows the user just checked off, instant with reduced motion; add an e2e test that a just checked-off row gets the drawing class and a row checked off by Ben does not
- [x] 7.6 Restyle claimed rows: shared inline padding for all rows, inset stripe on the leading edge plus tint, stronger dark-mode tint for others' claims, no negative margin; extend `tests/e2e/layout.spec.mjs` to check at 360 px that a claimed row does not extend beyond the other rows
- [x] 7.7 Style the edit mode of a row to match the preview (field full width, actions below, the delete button as a square trash-can icon button tinted in the danger color on the leading side, "Abbrechen" and "Speichern" on the trailing side); verify at 320 and 360 px in the layout test that nothing overflows
- [x] 7.8 Replace "Hinzufügen" with the "+" icon button (`aria-label="Hinzufügen"`); verify the add tests in `list.spec.mjs` find it by role and name and that Enter still adds
- [x] 7.9 Add the app icon to the header next to the app name and make the login button full width; verify `app-name.spec.mjs` and `login.spec.mjs` pass
- [x] 7.10 Check by screenshots at 375 px in light and dark mode (Playwright `colorScheme`) that list, section, edit mode, menu, logout sheet, login and status bar look consistent and nothing overflows; compare with the reviewed preview and fix what stands out

## 8. Documentation and integration

- [x] 8.1 Write `docs/design.md` (about one page, for humans: the "Einkaufszettel" idea, palette roles, type scale, shapes and depth, motion rules, do's and don'ts, why text is edited in the list and not in bottom sheets) and check that every value it names matches the tokens in `app.css`
- [x] 8.2 Update `AGENTS.md` (list of DOM-free modules: add `hold`, `prefs`; one line that visual changes follow `docs/design.md`; the vendored font next to the vendored SDK) and check `README.md` for statements about edit/delete buttons, the delete confirmation or the status bar; verify each change against the code
- [x] 8.3 Run `make fmt` and `make test`; verify lint, unit, API and e2e suites all pass

## 9. Real-phone check

- [x] 9.1 On a real iPhone, in light and dark mode: font and text size, checkbox look, the strike-through, claim stripe, the "Erledigt" section, the hold and the animation while checking off several items quickly
- [x] 9.2 On a real iPhone: account menu and logout sheet by touch, the edit mode with the keyboard open, and a long list scrolling under the status bar

## Workflow follow-up

- Android is not checked on a real device (none available); editing relies on standard browser behavior without platform-specific code, see design.md.
- Archive the change with `/opsx:archive` (sync specs) before committing, so code, main specs and the archived change land in one commit.
- Afterwards continue with `add-clear-checked-items`, which puts "Alle löschen" into the "Erledigt" header.
