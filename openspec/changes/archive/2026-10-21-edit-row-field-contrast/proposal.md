# Proposal

## Why

In edit mode the row is drawn in the surface color, the same color as the text field, the note field and the cancel button inside it. The fields lose their visible edge: the note field is hard to recognize as a field, and the text field only stands out while it has the focus ring. The add field does not have this problem because it sits on the page-colored header. The login screen has the same problem as the edit row: its fields are surface-colored on a surface-colored card. The logout confirmation dialog shows a white cancel button on a white dialog in light mode.

## What Changes

- The row in edit mode keeps the surface color, so it still stands out from the list.
- Inside that row, the text field, the note field and the cancel button take the page color and appear recessed, in light and dark mode.
- The same rule applies to the login card and to confirmation dialogs: their fields and non-primary buttons take the page color. The "Abmelden" button keeps its red frame and text.
- `docs/design.md` describes the rule: fields and buttons inside a surface- or raised-colored container use the page color.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-app`: adds a requirement that fields and buttons differ in color from the area they sit on, covering the row in edit mode, the add field, the login screen and confirmation dialogs.

## Impact

- `pb_public/app.css`: background of the fields and buttons in the edit row, the login card and confirmation dialogs.
- `docs/design.md`: color token table and the rule for fields inside containers.
- `tests/e2e/design.spec.mjs`: new check in light and dark mode.
- No server, schema or API changes.
