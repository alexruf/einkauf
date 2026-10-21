# Tasks

## 1. Recessed fields in the edit row

- [x] 1.1 Add an e2e test in `tests/e2e/design.spec.mjs`, for light and dark mode, checking that the note field, the unfocused text field and the delete, cancel and save buttons in an edit row have a background color different from the row's, and that the add field differs from the page color the header is based on. Also check that the edit row's background differs from the page. Verify the field part fails while the fields use `--surface`.
- [x] 1.2 In `pb_public/app.css`, give the fields and the cancel button in the edit row the background `var(--bg)`, with a comment explaining why. Verify the test from 1.1 passes.
- [x] 1.3 Update the color table in `docs/design.md` (`--bg` also covers the fields and buttons inside the edit row). Verify the doc matches `app.css`.
- [x] 1.4 Run `make fmt` and `make test`, and verify both pass.

## 2. Same rule for the login card and confirmation dialogs

- [x] 2.1 Add e2e tests in `tests/e2e/design.spec.mjs`, for light and dark mode: the email and password fields differ from the login card's background, and "Abbrechen" and "Abmelden" differ from the logout dialog's background. Verify they fail with the current CSS.
- [x] 2.2 In `pb_public/app.css`, merge the edit-row rule into one rule for all three containers (login card inputs, non-primary dialog buttons, edit-row inputs and cancel button), with one comment stating the design rule. Verify the tests from 1.1 and 2.1 pass.
- [x] 2.3 Update `docs/design.md`: the color table and a sentence stating the rule for fields and buttons inside surface- or raised-colored containers, limited to what `app.css` does. Verify the doc matches `app.css`.
- [x] 2.4 Run `make fmt` and `make test`, and verify both pass.

## Workflow follow-up

- Verify the change, then archive it (sync the specs) before committing, so code, main specs and the archived change land in one commit.
