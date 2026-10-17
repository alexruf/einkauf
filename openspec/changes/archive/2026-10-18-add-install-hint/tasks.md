# Tasks

## 1. Install hint on the login screen

- [x] 1.1 Add e2e tests in `tests/e2e/login.spec.mjs` for the browser case: the login screen shows a collapsed "App installieren" hint, the login form works without expanding it, expanding shows the iPhone/iPad (Safari) and Android (Chrome) steps, and collapsing hides them again; verify they fail before the markup exists
- [x] 1.2 Add the `<details class="install-hint">` block below the login form in `pb_public/index.html`, with German steps matching design.md, and style it in `app.css` next to the other login rules; verify the 1.1 tests pass and `tests/e2e/csp.spec.mjs` and `tests/e2e/layout.spec.mjs` still pass

## 2. Hide the hint in the installed app

- [x] 2.1 Add an e2e test that emulates `display-mode: standalone` via the Chromium DevTools protocol (`Emulation.setEmulatedMedia`) and expects the hint to be hidden; verify it fails before the CSS rule exists. If the pinned Chromium cannot emulate that feature, skip the test file change and note this for 2.3 instead
- [x] 2.2 Add `@media (display-mode: standalone) { .install-hint { display: none; } }` to `pb_public/app.css`; verify the 2.1 test passes (or, without the test, that the hint is still visible in a normal browser tab)
- [x] 2.3 Update `README.md`: mention in "Installing the app on a phone" that the login screen carries the same instructions, so a link is enough for new family members, and extend the "Install" manual check with "the login screen in the browser shows the install hint; the installed app does not"; verify the README steps match the hint text

## 3. Integration

- [x] 3.1 Run `make test` and verify all unit, API and e2e tests pass
- [x] 3.2 Run `openspec validate add-install-hint --strict` and verify the change is valid

## Workflow follow-up

- Go through the "Install" manual check on a real iPhone and Android phone.
- Archive the change with `/opsx:archive` once implementation and checks are done.
