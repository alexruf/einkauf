# Tasks

## 1. App version

- [x] 1.1 Add a unit test in `tests/unit/version.test.mjs` that checks `VERSION` matches `YYYY.0M.0D.MICRO` and that year, month and day form a real calendar date; verify it fails without the module
- [x] 1.2 Create `pb_public/js/version.js` exporting `VERSION` with the release date of this change and counter `0`, add it to `SHELL` in `sw.js`; verify the unit test and the service worker precache test pass
- [x] 1.3 Add "raise `VERSION` in `pb_public/js/version.js`" with the scheme and a short example to the update steps in the `README.md` deployment section, and add `version` to the DOM-free module list in `AGENTS.md`; verify both describe the new file accurately

## 2. Status and dialog texts

- [x] 2.1 Add unit tests in `tests/unit/view.test.mjs` for `syncStatus`: connecting, synchronized, one and several pending changes while online, offline with a sync today, yesterday and on an older date, and offline without any sync; build dates with the local `Date` constructor; verify they fail
- [x] 2.2 Implement `syncStatus({ connection, pending, lastSync, now })` in `pb_public/js/view.js` with the texts from design.md; verify the tests from 2.1 pass
- [x] 2.3 Add unit tests for `logoutQuestion` with 0, 1 and 2 pending changes, then implement it in `view.js`; verify they pass

## 3. Remembering the last synchronization

- [x] 3.1 Add unit tests in `tests/unit/sync.test.mjs` with an injected `now`: a successful flush stores `lastSync`, a flush that ends offline leaves the previous value, and `markSynced()` stores the current time; verify they fail
- [x] 3.2 Add `now` to the `createSync` options and implement `markSynced()`, called after a successful reload; verify the tests from 3.1 and the existing sync tests pass

## 4. Status bar

- [x] 4.1 Add a fixed `<footer class="footer">` to `index.html` with elements for the sync text and the version, styled in `app.css` as in design.md, including the bottom safe area and extra bottom padding for `main`; verify the 360 px layout tests in `tests/e2e/layout.spec.mjs` still pass
- [x] 4.2 Wire the footer in `app.js`: show `VERSION` on every screen, show `syncStatus(...)` only while logged in, re-render it from `render()`, and call `sync.markSynced()` when the connection leaves `online` and when the page becomes hidden while online; verify manually with `make dev` that the text follows going offline and online
- [x] 4.3 Add e2e tests in a new `tests/e2e/status-bar.spec.mjs`: the version is shown on the login screen and on the list, the bar says "Synchronisiert" when online, and after `goOffline` it shows "Zuletzt synchronisiert: heute" while the top offline notice is still visible; verify they pass with `make test`

## 5. Account menu and logout confirmation

- [x] 5.1 Replace the logout button in the header with a user name button that opens a `popover` menu containing "Abmelden", and style the menu in `app.css` with tap targets of at least 44 px; verify the layout tests pass with the menu open and closed
- [x] 5.2 Add the `#confirm-logout` dialog to `index.html` and wire it in `app.js`: "Abmelden" in the menu closes the menu and opens the dialog with `logoutQuestion(outbox.list().length)`, and only confirming calls `logout()`; verify manually that cancelling keeps the list
- [x] 5.3 Add a shared e2e helper that logs out through the menu and dialog, use it in `tests/e2e/session.spec.mjs` and `tests/e2e/csp.spec.mjs`; verify both files pass
- [x] 5.4 Add e2e tests: the header shows the display name and no "Abmelden" button; the menu opens from the name and closes with Escape; cancelling the dialog keeps the user logged in; with a pending offline change the dialog names 1 change that will be lost; verify they pass with `make test`

## 6. Account menu as a distinct layer

- [x] 6.1 Extend the e2e tests in `tests/e2e/account-menu.spec.mjs`: the open menu says "Angemeldet als" with the display name, and the page behind it is dimmed (the popover's `::backdrop` has a non-transparent background); verify they fail
- [x] 6.2 Add the "Angemeldet als" header with the display name and a logout icon to the menu in `index.html`, set the name in `app.js` wherever the header name is set, and restyle the menu in `app.css` with the `--raised` token, shadow, minimum width, danger color for "Abmelden" and a dimming `::backdrop`; verify the tests from 6.1 and the existing menu and layout tests pass

## 7. Connection and sync indicators

- [x] 7.1 Replace the `syncStatus` unit tests in `tests/unit/view.test.mjs` with tests for `connectionIndicator` (connecting, online, offline) and `syncIndicator` (online synced, one and several pending while online, not online with a sync today, yesterday and older, not online with pending changes, never synced), each checking `state` and `text`; verify they fail
- [x] 7.2 Implement `connectionIndicator` and `syncIndicator` in `pb_public/js/view.js` as in design.md and remove `syncStatus`; verify the tests from 7.1 pass
- [x] 7.3 Replace the sync text in the footer of `index.html` with two indicator chips (dot plus text), wire them in `app.js` by setting `data-state` and the text, hide them on the login screen, and show the version without the "v" prefix; verify the unit tests still pass
- [x] 7.4 Style the footer in `app.css` as in design.md: `--warn` token, chip colors per state, pulsing `busy` dots switched off under `prefers-reduced-motion`, translucent blurred bar with a light top border; verify on a 360 px viewport that both chips and the version fit in one line without horizontal scrolling and without cutting off any text
- [x] 7.5 Update `tests/e2e/status-bar.spec.mjs` to the indicators: "Verbunden" and "Synchronisiert" with state `ok` when online; after `goOffline` "Offline" with state `error` and "Stand heute, …" while the top notice is still visible; the version without "v" on the login screen and the list; add a 360 px check that the footer fits in one line without cutting off the longest texts; verify they pass with `make test`

## 8. Integration

- [x] 8.1 Run `make test` and verify all unit, API and e2e tests pass, including the CSP test without violations
- [x] 8.2 Check on a phone against a local or deployed instance that the footer does not cover the last item, respects the home indicator, that the indicators are readable in light and dark mode, and that the menu and dialog are usable by touch; record the result
  - Result: not checked on a real phone. The user closed the task and deferred the device check to a separate later round on design details. Covered so far only by the e2e tests at 360 px and screenshots in desktop Chromium.

## Workflow follow-up

- Archive the change after review, which syncs the delta specs into `openspec/specs/`.
