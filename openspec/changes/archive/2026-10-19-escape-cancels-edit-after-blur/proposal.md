# Proposal

## Why

On the desktop, the edit mode is meant to cancel on Escape, and it does when the key reaches the edit row. In some setups the first Escape only takes the focus off the text field: browser extensions with keyboard navigation (Vimium, for example) use Escape to leave a field and swallow the key. Focus then sits on the page body, outside the row, so pressing Escape again does nothing and the user has to reach for the mouse to hit "Abbrechen".

## What Changes

- While a row is in edit mode and no element has focus (focus is on the page body), Escape cancels the edit, like the "Abbrechen" button. In practice: if the first Escape only leaves the field, the second one cancels.
- Escape inside the edit row keeps cancelling at once, as today.
- Escape keeps its existing meaning elsewhere: in the add field it only hides suggestions, and in a dialog or the account menu it only closes those. It does not cancel the edit there.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `shopping-list`: the "Editing in the row" requirement also covers Escape pressed while nothing is focused, so the edit can be cancelled after the field lost focus.

## Impact

- `pb_public/js/app.js`: one document-level Escape listener for the edit mode, next to the existing row listener.
- `tests/e2e/edit.spec.mjs`: new tests for Escape after the field lost focus and for Escape in the add field not cancelling the edit.
- No server, schema, or service worker changes.
