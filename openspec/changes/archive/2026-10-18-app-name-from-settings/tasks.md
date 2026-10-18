# Tasks

## 1. Default application name

- [x] 1.1 Verify against PocketBase 0.40.5 (docs or a temp server) that the settings field is `settings.meta.appName` and that its default on a fresh data directory is "Acme"; update design.md if either differs
- [x] 1.2 Write a failing API test in `tests/api/app-name.test.mjs` that reads the settings as a superuser on a fresh temp server and expects `meta.appName` to be "Einkauf"
- [x] 1.3 Add a settings-only migration in `pb_migrations/` that sets `meta.appName` to "Einkauf" only if it is "Acme", with a down migration that restores "Acme" only if it is "Einkauf"; verify the test from 1.2 passes
- [x] 1.4 Verify by hand on a local `pb_data/` that a custom name such as "Familieneinkauf" survives `migrate down 1` followed by `migrate up`, and that the default name round-trips between "Einkauf" and "Acme"

## 2. Public name endpoint

- [x] 2.1 Extend `tests/api/app-name.test.mjs` with failing tests: an unauthenticated `GET /api/einkauf/app-name` returns 200 with exactly `{ "name": "Einkauf" }`, and after a superuser changes the name to "Familieneinkauf" it returns that name
- [x] 2.2 Add `pb_hooks/app-name.pb.js` with the unauthenticated route returning `{ name: meta.appName }`; verify the tests from 2.1 pass

## 3. Cached name module

- [x] 3.1 Write failing unit tests in `tests/unit/app-name.test.mjs`: the fallback is "Einkauf" when nothing is stored, a remembered name is returned afterwards, empty or non-string values are ignored, and the stored name is independent of the user-scoped `einkauf` key
- [x] 3.2 Add the DOM-free module `pb_public/js/app-name.js` with its own localStorage key and add it to `SHELL` in `sw.js`; verify the unit tests and the existing `SHELL` completeness test pass

## 4. Showing the name in the app

- [x] 4.1 Change the e2e test in `tests/e2e/service-worker.spec.mjs` to detect the new deployment by a marker in `index.html` that `app.js` does not overwrite, instead of `<title>`; verify the test still passes before the app wiring changes
- [x] 4.2 Write failing e2e tests: after a superuser sets the name to "Familieneinkauf", the login screen header and the page title show it, and after going offline with `goOffline` and reloading, both still show it
- [x] 4.3 Wire `app.js` to apply the cached name to the header and `document.title` at startup, then fetch `/api/einkauf/app-name`, remember the result and apply it again, and keep the cached name when the request fails; give the header element an id if needed; verify the tests from 4.2 pass
- [x] 4.4 Verify that the existing e2e checks for the title "Einkauf" and the manifest name still pass unchanged

## 5. Documentation and integration

- [x] 5.1 Add `app-name` to the list of DOM-free modules in `AGENTS.md` and the new hook file to the server logic notes; verify the descriptions match the code
- [x] 5.2 Add a short note in `README.md` that the name shown in the app comes from "Application name" in the admin UI settings, while the name of the installed app comes from `manifest.webmanifest`; verify the manual check for installing still reads correctly
- [x] 5.3 Run `make test` and verify that the unit, API and e2e suites all pass

## Workflow follow-up

- Deploy, then check in production that the admin UI shows "Einkauf" (unless it was already changed) and that renaming it changes the app header after a restart of the app.
- Archive the change with `/opsx:archive` after review.
