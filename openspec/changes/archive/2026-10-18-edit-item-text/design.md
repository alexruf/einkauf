# Design

## Context

See proposal.md for the motivation and the delta specs for the requirements.

The current state that shapes the approach:

- The items `updateRule` in `pb_migrations/1792264600_create_items_and_harden_users.js`
  refuses any update that contains `text`. The hook `applyMemberWrite` in
  `pb_hooks/items.js` trims the text only on create, and on every write it
  sets `updatedBy` and keeps `createdBy`.
- Every write goes through the outbox. Its operations are absolute values
  (`create`, `setChecked`), so sending one twice is harmless. `sync.js` sends
  them in order and drops a `setChecked` that gets a 404, because that item
  was deleted meanwhile.
- `view.buildRows` lays the pending operations over the last snapshot from the
  server. That is how offline changes show up right away.
- `render()` in `app.js` rebuilds every row on each change, including realtime
  events from other users. Anything typed into a row would be lost.
- Deleting already uses a `<dialog class="confirm">` with `method="dialog"`.
  The CSP forbids inline scripts and styles.

## Goals / Non-Goals

**Goals:**
- Editing uses the same outbox and sync path as checking off, so it works
  offline without new sync rules.
- Make as few changes as possible: one new outbox operation, one new dialog,
  one new migration.

**Non-Goals:**
- Detecting conflicts. The last write wins, as it already does for the
  checked state.
- Showing a live update of the text inside an open edit dialog.

## Decisions

### A new absolute outbox operation `setText`

`{ type: 'setText', id, text }` carries the whole new text. Sending it twice
writes the same value twice, which fits the "Repeated delivery has no side
effects" requirement without extra work. `sync.send` maps it to
`items.update(id, { text })`. `classify` treats a 404 for `setText` like one
for `setChecked`: the item was deleted, so the change is dropped quietly. A 400
(empty after trimming, or too long) ends up as `rejected` and shows the
existing notice "Eine Änderung wurde vom Server abgelehnt und verworfen."

`buildRows` applies `setText` the same way it applies `setChecked`: only when
the item exists, which includes a pending `create`, and it marks the row as
pending with the user as last editor. A pending `create` followed by `setText`
is sent as two requests in that order. That is simpler than rewriting the
queued `create` and gives the same result.

Alternatives considered:
- A generic `update` operation with arbitrary fields. Rejected because it
  is vaguer than the two specific operations and invites partial updates
  whose meaning depends on the order.
- Rewriting the text of a pending `create` in the outbox. Rejected because
  it would be a second code path for one edge case.
- Editing only while online with a direct request, as deleting does.
  Rejected because the user decided that editing must work in the shop.

### The server allows text in updates and trims it

A new migration sets the items `updateRule` to the family-member check alone.
Its down migration restores the rule that refuses `text`. The original
migration stays untouched, because production has already applied it.

`applyMemberWrite` trims the text on every write, not only on create. The
author fields and `checkedAt` are already overwritten by the hook, so loosening
the rule does not make them forgeable. The `required` and `max: 200` checks on
the field reject an empty or overlong text. This assumes that PocketBase
validates the record after the request hook has changed it, which the create
path already relies on. The API tests check it for whitespace-only updates.

### Editing happens in a dialog, not inline

A `<dialog class="confirm" id="edit-item">` contains a form with
`method="dialog"`, a text input (`maxlength="200"`, `enterkeyhint="done"`),
and the buttons "Abbrechen" and "Speichern". The dialog lives outside
`#items`, so re-renders triggered by realtime events do not affect it. Enter
submits the form as "Speichern". Escape cancels, as the browser's default for
dialogs.

When the dialog closes with "Speichern", `app.js` trims the input and
compares it with the row's current text from a fresh `buildRows`. It adds a
`setText` only if the text is not empty and has changed. Then it renders and
flushes, the same as `setChecked`. The unchanged check matters because
otherwise saving without a change would make the user the last editor.

If the edited item disappears from the list while the dialog is open, for
example because another user deleted it, `render()` closes the dialog without
saving. If another user changes the text meanwhile, the input keeps what the
user typed, and saving overwrites it (last write wins).

Alternatives considered:
- An input field inside the row. Rejected because every re-render would
  destroy it, and keeping it alive would mean rendering rows differently.
- An overflow menu ("…") holding both edit and delete. Rejected because it
  makes deleting take an extra tap and adds a popover per row. The space a
  second button takes up is acceptable (next section).

### The edit button sits left of the delete button and is never disabled

The row becomes `[label.toggle (flex: 1)] [button.edit] [button.delete]`. The
edit button reuses the delete button's styling: same size (`--tap`, 2.75rem),
no border, muted color, and a pencil icon as inline SVG in the template. Its
label is `aria-label="Bearbeiten"`. The label element still covers the
checkbox and the text, so tapping the text checks the item off as before.
On a 375px phone the check-off area shrinks by about 44px.

The button stays enabled offline and for pending rows, since editing goes
through the outbox. The focus handling at the end of `render()` learns
about `.edit`, so keyboard focus survives re-renders the way it does for
`.delete`.

## Risks / Trade-offs

- [An offline edit synchronized late overwrites a newer online edit] → This
  is accepted and documented in the offline-sync delta. Silently losing a
  text in a family list is a small cost compared with conflict UI.
- [Two consecutive edits offline queue two requests] → Harmless, because
  each one is an absolute value. The outbox is small.
- [App versions cached by the service worker do not have the edit button] →
  They still show edited texts through realtime events and reloads, and they
  never send text updates. No compatibility problem.
- [The validation-order assumption is wrong] → The API tests for an
  update with only spaces catch this. In that case the hook refuses an empty
  trimmed text itself.

## Migration Plan

Deploy as usual: tag checkout and container restart. PocketBase applies the
new migration on startup. To roll back, check out the previous tag and run
`migrate down 1`, which restores the strict `updateRule`. Texts that were
already edited stay as they are.
