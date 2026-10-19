# Tasks

## 1. Escape without focus cancels the edit

- [x] 1.1 Add e2e test in `tests/e2e/edit.spec.mjs`: given the edit mode with changed text, when the field is blurred and Anna presses Escape, then the row closes, the item keeps its text on the server and the more button has focus; verify it fails before the fix
- [x] 1.2 Add e2e test in `tests/e2e/edit.spec.mjs`: given the edit mode with changed text, when Anna types in the add field with suggestions shown and presses Escape there, then the edit row stays open with its typed text; verify it passes before and after the fix
- [x] 1.3 Add a document-level `keydown` listener in `pb_public/js/app.js` that calls `cancelEdit()` on Escape while `editing` is set and focus is on the body (per design.md); verify the tests from 1.1 and 1.2 and the existing Escape test pass
- [x] 1.4 Run `make fmt` and `make test`; verify lint, unit, API and e2e all pass

## Workflow follow-up

- Verify the change, then archive it with `/opsx:archive` (sync specs) before committing, so code, main spec and archived change land in one commit.
