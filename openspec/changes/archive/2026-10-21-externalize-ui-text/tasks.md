# Tasks

## 1. Intl output for German

- [x] 1.1 In a scratch script, not committed, print `Intl.DateTimeFormat('de', …)` for the dates of the four "Stand …" cases in `tests/unit/view.test.mjs` (day and month two-digit, with and without a two-digit year; hour and minute two-digit) in Node from the dev shell and in Chromium through Playwright. Verify each gives exactly "15.10.", "30.12.25" and "09:10"/"17:45"/"14:32"/"18:05". If any differs, record in `design.md` that `formatDate` builds the date from `formatToParts` with a catalog pattern, and do that in 2.2

## 2. The i18n module

- [x] 2.1 Write failing unit tests in `tests/unit/i18n.test.mjs` for `createI18n({ locale: 'de', messages })` with a small fake catalog: `t` returns a plain text; replaces `{name}` and several placeholders; picks `one` for count 1 and `other` for 0 and 2; throws an error naming the key for a missing key, a missing placeholder value, an unknown param and a plural value without `other`; `tParts` splits "Angemeldet als {name}" into `['Angemeldet als ', { name: 'name' }]` and a text with the placeholder first or alone correctly; `formatTime` and `formatDate` give the strings checked in 1.1. Verify they fail because the module is missing
- [x] 2.2 Implement `pb_public/js/i18n.js` as described in the design: `createI18n`, `LOCALE = 'de'`, and the German instance's `t`, `tParts`, `formatTime` and `formatDate` as named exports, with a header comment that says keys are always string literals. Create `pb_public/js/messages/de.js` exporting an empty `messages` object for now. Add both files to `SHELL` in `pb_public/sw.js` and `i18n` to the DOM-free module list in `AGENTS.md`. Verify the tests from 2.1 and the rest of `tests/unit/` pass

## 3. Key check

- [x] 3.1 Write `tests/unit/messages.test.mjs`: collect the keys of all `data-i18n`, `data-i18n-aria-label`, `data-i18n-title` and `data-i18n-placeholder` attributes in `pb_public/index.html` and of all `t('…')` and `tParts('…')` calls in `pb_public/js/*.js`; one test fails naming every used key missing from `messages`, another naming every catalog key nobody uses. Verify both pass with the empty catalog, and that a temporarily added `data-i18n="nope"` and a temporary catalog key make each fail with the key in the message
- [x] 3.2 Add the rule to the frontend bullets in `AGENTS.md`: user-facing text only through `messages/de.js`, keys as literals, values may hold placeholders and plural forms but no markup. Verify `make lint` passes

## 4. Texts in view.js

- [x] 4.1 Move the meta line (`von {creator}`, `von {creator} · zuletzt {editor}`, `Du besorgst das`, `{name} besorgt das`, `Unbekannt`), the connection and sync indicator texts (with `sync.sending` as a plural value), the logout questions and the words and patterns of `formatSyncTime` into the catalog, and use `t`, `formatTime` and `formatDate` in `pb_public/js/view.js`. Keep `logoutQuestion(0)` as its own key. Verify `tests/unit/view.test.mjs` passes unchanged and `tests/unit/messages.test.mjs` passes

## 5. Texts in app.js

- [x] 5.1 Move the session-expired, rejected-change, offline and duplicate notices (`„{text}“ steht schon drauf.`), the claim button labels, `Erledigt ({count})`, the "steht schon drauf" note in suggestions and the three login errors into the catalog and use `t` in `pb_public/js/app.js`. Verify `tests/unit/messages.test.mjs` passes and the e2e specs `session`, `offline-sync`, `duplicates`, `claim`, `done-section`, `suggestions` and `login` pass unchanged

## 6. Markup with keys only

- [x] 6.1 Write a failing e2e test in a new `tests/e2e/catalog.spec.mjs`: fetch `index.html` as served, parse it with `DOMParser` inside the page and walk every element including `<template>` contents; apart from `<title>`, `#app-name`, `<script>` and `<style>`, no element has a non-whitespace text node or a non-empty `aria-label`, `title`, `placeholder` or `alt`. Verify it fails and lists today's texts
- [x] 6.2 Add e2e tests to `tests/e2e/catalog.spec.mjs` for texts no other test asserts: the add field's placeholder "Was wird gebraucht?" and the add button's `title` "Hinzufügen"; the empty state "Alles erledigt. Was wird als Nächstes gebraucht?"; the third iPhone step with „Zum Home-Bildschirm“; the row's "Mehr" `title`; the account menu header "Angemeldet als Anna" with "Anna" inside a `<strong>`; `document.documentElement.lang` is "de". Verify they pass before the markup changes
- [x] 6.3 In `pb_public/js/app.js`, add the function that fills `data-i18n`, `data-i18n-aria-label`, `data-i18n-title` and `data-i18n-placeholder` from `t`, and call it at start for `document` and each template's content before any screen is shown; set `document.documentElement.lang` from `LOCALE`. Build the account menu header in `showUserName` from `tParts('account.signedInAs')` with the name in the existing `<strong>` via `textContent`
- [x] 6.4 Replace every text in `pb_public/index.html` with keys and add them to the catalog in page order: give the login label texts and the logout menu item's text their own `<span>`, split the empty state into two keys, and keep `<title>`, `#app-name` and the static `lang="de"`. Verify the tests from 6.1 and 6.2, `tests/unit/messages.test.mjs` and the e2e specs `login`, `account-menu`, `edit`, `layout`, `design`, `csp` and `service-worker` pass

## 7. Integration

- [x] 7.1 Run `make fmt`, then `make test`, and verify lint, unit, API and all e2e tests pass. Check that `README.md` and `docs/design.md` still describe the app correctly and update anything this change made stale

## Workflow follow-up

- Verify the change, then archive it with `/opsx:archive` so the main `web-app` spec gets the new requirements, and commit code, specs and the archived change together.
