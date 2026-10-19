# Design

## Context

See proposal.md for the motivation and `specs/shopping-list/spec.md` for the
requirements.

The current state that shapes the approach:

- `pb_public/js/suggest.js` exports `normalize` (trim, collapse whitespace,
  lower case), which the server mirrors for purchase keys. `suggest()`
  already marks suggestions whose normalized text equals an open item.
- `app.js` builds the rows on screen with `currentRows(user)`, which merges
  the snapshot with pending outbox operations. `updateSuggestions` takes the
  open items as the rows with `!row.checked`. Pending creates are rows too,
  so an item added offline is already on that list.
- The add form submit trims the text, clears the field and calls `addItem`.
  `saveEdit` closes the edit mode first and then calls `setText`.
- Every render replaces all row elements, so any row state must live in
  `app.js` and be applied in `rowElement`, the way `strikes` keeps the
  crossing-off animation alive across renders.
- `showNotice(text)` shows a message in the `#status` element
  (`role="status"`) for 6 seconds, so it is visible and announced to
  screen readers.
- `docs/design.md` allows only one expressive animation, says colors carry
  meaning, and turns all motion off for reduced motion. The add form is
  sticky; list rows have `scroll-margin-top` so `scrollIntoView` keeps them
  below it.

## Goals / Non-Goals

**Goals:**
- The duplicate lookup is a pure function with unit tests; `app.js` only
  decides what to do with its result.
- Adding and editing use the same lookup and the same feedback.

**Non-Goals:**
- Catching duplicates the app cannot see: concurrent adds on two devices,
  an add synchronized from an offline device, or un-checking an item whose
  text is open again.
- Any server-side check. The server keeps accepting duplicate texts, so
  replayed offline operations never fail because of this change.

## Decisions

### `findOpenItem(items, text, exceptId)` in `suggest.js`

It takes `[{ id, text }]` of open items and returns the first one whose
normalized text equals the normalized `text`, skipping `exceptId`, or
`undefined`. It lives next to `normalize`, because "the same text" must mean
the same thing for suggestions, purchases and duplicates. A new module would
need its own `SHELL` entry for one function. `suggest()` keeps its own set
lookup, which is the same rule applied to many purchases at once.

Alternative: put it in `view.js` next to `buildRows`. Rejected, because
`view.js` would have to import `normalize` from `suggest.js` anyway.

### The check runs before the outbox

The add submit and `saveEdit` look up the open rows from `currentRows(user)`
(the same list the user sees) before anything is written. A duplicate never
enters the outbox, so there is nothing to roll back and no flicker of a
second row. For an edit, only an edited open item is checked; the edited
item's own id is skipped, so changing only the case of its text is saved.

### Feedback: highlight, scroll, notice

- `app.js` keeps `highlighted = { id, start, timer }`. `rowElement` adds the
  class `is-highlighted` while it is set, so re-renders in between (realtime
  events, the outbox flush) keep it. After 2 seconds the timer clears it and
  re-renders. A new highlight replaces the previous one.
- When adding, the highlighted row is scrolled into view with
  `{ block: 'nearest' }`, and the add field keeps the focus, so the phone
  keyboard stays open as after adding an item.
- When editing, the edit row keeps the focus and the draft; the other row is
  not scrolled to, because moving the list would push the edit field away
  from the keyboard. The notice names the item, so the user knows which one
  it is.
- The message goes through `showNotice`, with the existing item's text as
  shown: `„Milch“ steht schon drauf.`, matching the wording of the
  suggestions.

### Highlight style

The row gets a `--notice` background, the token the status bar already uses
for "pay attention to this". No new token is needed. The tint holds for most
of the 2 seconds and fades out at the end, which is not an expressive
animation. Because every render replaces the row element, a CSS transition
would never run; the fade is a keyframe animation instead, and `rowElement`
sets a negative `animation-delay` from `start`, so a re-render continues the
fade where it was, the same way `strikes` keeps the strike-through going.
With reduced motion the tint simply appears and disappears. A claimed row keeps its claim stripe,
so claim information stays visible while highlighted.

Alternative: an outline in `--accent`. Rejected, because green means "done"
or "the main action" in `docs/design.md`.

## Risks / Trade-offs

- [The highlighted row may be under the phone keyboard after an edit] →
  The notice names the item, and the edit field stays where it was.
- [A deliberate duplicate, such as two separate "Milch" errands, is no
  longer possible] → Adding "Milch 2x" or editing the text works, as the
  idea in `docs/ideas.md` assumed; the family decided against a confirm
  step.
- [Notice and offline message share the status bar] → `showNotice` already
  takes precedence for 6 seconds and then the offline message returns; this
  is the existing behavior for rejected changes.
