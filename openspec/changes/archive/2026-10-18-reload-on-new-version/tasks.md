# Tasks

## 1. Reload decision module

- [x] 1.1 Write failing unit tests in `tests/unit/update.test.mjs` for `parseVersion`: it reads the version from the text of `version.js` (including the real file's text) and returns `null` for an empty or unrelated text, verified by `node --test` failing because the module is missing
- [x] 1.2 Write failing unit tests for `createUpdater` with `tests/support/memory-storage.mjs` as backend: no reload for the running version; a different version plus `busy` false gives one reload; `busy` true defers it until a later `takeReload(false)`; a version already reloaded for is not reloaded again; a newer version after that is reloaded (spec "No reload loop")
- [x] 1.3 Implement `pb_public/js/update.js` as described in design.md and verify the tests from 1.1 and 1.2 pass
- [x] 1.4 Add `/js/update.js` to `SHELL` in `pb_public/sw.js` and add `update` to the DOM-free module list in `AGENTS.md`, and verify the SHELL test in `tests/e2e/service-worker.spec.mjs` passes

## 2. Service Worker leaves the check to the network

- [x] 2.1 Write a failing e2e test in `tests/e2e/service-worker.spec.mjs`: after the Service Worker controls the page, `fetch('/js/version.js', { cache: 'no-store' })` while offline (`goOffline`) fails instead of being answered from the cache
- [x] 2.2 Skip requests with `request.cache === 'no-store'` in the `fetch` handler of `sw.js`, update its header comment, and verify the test from 2.1 and the existing Service Worker tests pass

## 3. Check and reload in the app

- [x] 3.1 Write failing e2e tests in a new `tests/e2e/update.spec.mjs`. Follow the "after a deployment" pattern in `service-worker.spec.mjs`: a separate server with a copied `pb_public`, reached through `startProxy`. A deployment means writing a new `version.js` (with the Last-Modified `utimes` bump) and cutting and restoring the proxy so the app reconnects. Cover: idle app reloads and the status bar shows the new version; unchanged version does not reload; text in the input field is kept and the reload follows adding the item, with the item on the list; open edit dialog defers the reload until it is closed; a pending outbox change survives the reload and is sent
- [x] 3.2 In `app.js`, start the version check from the `PB_CONNECT` handler (fetch with `no-store`, `parseVersion`, `found`), log failures with `console.warn`, and attempt the reload with the `busy` rule from design.md. Use `sessionStorage` as the updater's backend. Verify the idle, unchanged-version and outbox tests from 3.1 pass
- [x] 3.3 Add the deferred attempts after the add form was submitted, after any dialog closed (postponed with `setTimeout`) and after a running delete finished, with a running-delete counter in `deleteItem`. Verify all tests from 3.1 pass

## 4. Documentation and full run

- [x] 4.1 In `README.md`, add to "Update" that open apps reload themselves after the restart, and add a phone check to the checklist: with the app in the background, deploy a release; when the app is brought back, it shows the new version in the status bar. Verify the text matches the behavior in the specs
- [x] 4.2 Run `make fmt` and then `make test` and verify everything passes

## Workflow follow-up

- Verify the change with `/opsx:verify`, then archive it with `/opsx:archive` (sync specs) before committing, so code, main specs and the archived change land in one commit.
