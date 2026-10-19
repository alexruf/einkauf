# Design

## Context

The edit row gets its own `keydown` listener in `editRowElement` (`pb_public/js/app.js`), which calls `cancelEdit()` on Escape. A key event only reaches that listener when focus is inside the row. When something moves focus off the field without a click elsewhere (an extension consuming Escape, or a script calling `blur()`), focus falls back to `document.body` and the row never sees the next key. See proposal.md for the user-facing problem.

## Goals / Non-Goals

**Goals:**
- Escape cancels the edit when focus is on the body while a row is in edit mode.

**Non-Goals:**
- Counting Escape presses or reacting to focus loss itself. The app cannot see an Escape that an extension swallowed, so it does not try to.
- Cancelling the edit when focus is in another control (add field, account menu, dialog, another row's buttons). Those keep their own Escape handling.

## Decisions

**One document-level listener, guarded by focus on the body.** A single `keydown` listener on `document`, registered once next to the other top-level listeners, calls `cancelEdit()` when the key is Escape, a row is in edit mode, and `document.activeElement` is `document.body` (or null). The existing row listener stays as it is.

- Alternative: move all Escape handling to the document and cancel whenever `editing` is set. Rejected because Escape in the add field (hide suggestions), the account menu, and dialogs would then also cancel an edit in progress, which loses typed text unexpectedly.
- Alternative: listen for `blur` on the field and arm a "next Escape cancels" flag. Rejected because the flag would also be armed by an ordinary click elsewhere, and it adds state for no gain over checking where focus is when the key arrives.

**No double cancel.** An Escape inside the row bubbles to the document after the row listener has already run `cancelEdit()`. By then `editing` is null and focus is on the row's more button, so the document guard does not fire again.

## Risks / Trade-offs

- [After a click on empty page space, focus is also on the body, so Escape then cancels too] → This is intended: with nothing focused, Escape has no other meaning in the app, and cancelling matches the spec.
- [Some extensions swallow every Escape, not just the first] → Then neither listener ever sees the key; the "Abbrechen" button remains the fallback. Nothing the page can do about that.
