# Tasks

## 1. Test tooling spike

- [x] 1.1 Add `nodejs` and `playwright-test` to the dev shell in `flake.nix` and set `PLAYWRIGHT_BROWSERS_PATH` to `playwright-driver.browsers`; verify `nix develop -c node --version` and `nix develop -c playwright --version` work and report matching runner and browser versions
- [x] 1.2 Write a throwaway Playwright test that opens `about:blank` in Chromium, run it with `nix develop -c playwright test` and verify it passes without `node_modules`. If it fails, stop and ask the user (design: Risks)
- [x] 1.3 Check that Node loads a `pb_public/js/*.js` ES module without a `package.json`, and that PocketBase serves `.mjs` as `text/javascript`; record the outcome in design.md and apply the fallback from design.md if either fails

## 2. Test harness

- [x] 2.1 Implement `tests/support/server.mjs`: start PocketBase on a temp `--dir` and a free port with the repo's migrations, hooks and public dir, create a superuser with the CLI, create test users through the API, get tokens through impersonation, and stop and remove everything afterwards. Verify with a smoke test that `/api/health` responds and nothing is left running
- [x] 2.2 Add `make test` (node tests, then Playwright with `playwright.config.mjs` that starts the server in global setup); verify that it exits 0 with the smoke test, exits non-zero with a deliberately failing test, and leaves `pb_data/` untouched
- [x] 2.3 Document `make test` in README.md and replace the "no test harness" line in AGENTS.md; verify the README command runs as written

## 3. Accounts and access rules

- [x] 3.1 Write a failing API test file for user-auth: self-registration refused, users cannot create or delete accounts, an account with an empty or 31-character display name is rejected even for the superuser, the user list shows ids and names but no other emails, unauthenticated item list and realtime subscription get nothing
- [x] 3.2 Add a migration that hardens `users` rules and creates the `items` collection with fields and rules from design.md (verify migration API against 0.40.5); verify the 3.1 tests pass and the down migration restores the defaults in a fresh temp instance
- [x] 3.3 Add API tests for items: create with valid, empty and 201-character text; update of `text` refused; update of `checked` allowed; delete allowed; client-supplied id accepted and duplicate id rejected. Verify they pass
- [x] 3.4 Write a failing test for rate limiting on auth, then add a migration enabling the rate limiter and trusted proxy headers (verify settings field names against 0.40.5); verify the test passes and the other API tests still pass

## 4. Server hooks

- [x] 4.1 Write failing API tests: `createdBy` and `updatedBy` come from the auth token even when the client sends other values; checking off sets `checkedAt`, un-checking clears it; deleting a creator's account keeps the item with an empty `createdBy`
- [x] 4.2 Implement the item request hooks in `pb_hooks/` with shared code in a `require()`d module (verify hook API against 0.40.5); verify the 4.1 tests pass
- [x] 4.3 Write failing API tests for cleanup: an item checked off 25 hours ago (backdated as superuser) is deleted by `POST /api/einkauf/cleanup`, an item checked off 1 hour ago and an old open item remain, non-superusers get 401/403, and a realtime subscriber receives the delete event
- [x] 4.4 Implement the cleanup function, the hourly `cronAdd` job and the superuser-only route; verify the 4.3 tests pass and `make dev` logs no hook errors on startup

## 5. Client core logic

- [x] 5.1 Implement `js/ids.js` and `js/storage.js` with unit tests: ids match the PocketBase id pattern; storage is scoped to a user id and cleared when a different user logs in or on logout; verify `node --test tests/unit` passes
- [x] 5.2 Implement `js/outbox.js` and `js/view.js` with unit tests: ops kept in order and across reloads; merge shows pending creates and checked overrides marked as pending; sort order from design.md; verify unit tests pass
- [x] 5.3 Implement `js/sync.js` with unit tests using a fake pb client: flush sends ops in order, stops on network error and keeps ops, stops on 401, drops `setChecked` on 404, treats a duplicate create as done, drops other 4xx with a notice, reloads items and user names after flush; verify unit tests pass

## 6. Frontend

- [x] 6.1 Vendor the newest PocketBase JS SDK release compatible with server 0.40.5 into `pb_public/vendor/` with its version and source URL in a comment; verify the SDK loads in the browser through `make dev` and resolve the design's open question
- [x] 6.2 Build the login screen and session handling in `index.html`, `app.css` and `js/app.js` (German texts, error message without revealing whether the email exists, auth refresh on start, own display name shown in the header); add e2e tests for login success with the own display name visible and no email shown, wrong password, returning without credentials and the login screen without a session; verify they pass
- [x] 6.3 Build the list screen: add, check off, un-check, author meta line and "Unbekannt" fallback, all writes through outbox and sync, live updates via realtime with flush on `PB_CONNECT`; add e2e tests with two contexts (Anna adds, Ben sees within seconds with "von Anna"; Ben checks off and Anna sees "zuletzt Ben"; markup in the item text is shown as text); verify they pass
- [x] 6.4 Build delete: button disabled while offline, `<dialog>` confirmation for open items only; add e2e tests for deleting checked and open items, cancelling, and the disabled state offline; verify they pass
- [x] 6.5 Add the CSP meta tag from design.md and remove any inline script or style; verify with an e2e test that no CSP violation is reported while using the app
- [x] 6.6 Apply the responsive layout and the light and dark themes from design.md; add an e2e test at 360 px width (no horizontal scroll, tap targets at least 44 px) and a desktop test (add with Enter); verify they pass and check both themes visually with screenshots

## 7. Offline and PWA

- [x] 7.1 Add `manifest.webmanifest` and icons (SVG plus PNG renderings for 180, 192 and 512 px produced with Playwright screenshots) and link them in `index.html`; verify Chromium reports the app as installable and standalone in an e2e check of the manifest
- [x] 7.2 Implement `sw.js` with app shell precache and network first with a 3 second timeout, excluding `/api/` and `/_/`; add e2e tests: the app opens offline with the last known list and the offline hint, and a changed `index.html` is served on the next online load; verify they pass
- [x] 7.3 Add e2e tests for offline sync with two contexts: Anna adds and checks off offline, the changes survive a reload while offline, after reconnect Ben sees them with "zuletzt Anna" and the pending marks disappear; Ben's changes made meanwhile appear for Anna; an item deleted by Ben while Anna checked it off offline stays deleted and Anna's other changes sync. Fix the client until they pass
- [x] 7.4 Add e2e tests for sessions: logout and then reload offline shows no list data; an expired session keeps pending changes and syncs them after the same user logs in; another user logging in discards them. Verify they pass

## 8. Integration and docs

- [x] 8.1 Run `make test` and `make check-version` from a clean checkout; verify both exit 0
- [x] 8.2 Update README.md: creating family accounts with a display name in the admin UI, installing the app to the home screen (iOS data eviction), and the deployment steps; verify the README and AGENTS.md match the implemented behavior
- [x] 8.3 Write a short manual checklist in README.md for what automated tests cannot cover (real phone, iOS Safari, airplane mode in a shop) and run it once locally on a phone in the same network; report the results to the user
  - Run on 2026-10-18 against the deployed instance instead of the local network, because Service Workers need HTTPS and offline mode cannot be tested over plain HTTP. All eight checklist items passed without errors.

## Workflow follow-up

- [x] After deployment, verify with two devices that rate limiting distinguishes clients behind Traefik (design: Risks). Verified on 2026-10-18: after ten failed logins through a VPN, the next attempt was asked to wait a minute; without the VPN, the login worked immediately.
- Archive the change after review.
