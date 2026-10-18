# Proposal

## Why

The app works well, but using it one-handed in a shop is harder than it
needs to be. Each row carries three equal-weight icons that squeeze the text
and put delete right next to edit. Rows jump to a new position the moment
they are checked off or un-checked, so the item under the user's finger can
change and a second tap can hit the wrong item. In dark mode the native iOS
checkboxes render as black holes and someone else's claim is barely
visible. The look itself is mostly browser defaults: system font, small
item text and no visual identity. This change improves design and
usability across the whole app, so that it reads as one consistent,
legible design on phones and stays fully usable with mouse and keyboard on
the desktop.

## What Changes

Guiding rules for the whole change:

- The app must work well one-handed on a phone and fully with mouse and
  keyboard on the desktop. Gestures may only be shortcuts for a visible,
  focusable button; nothing appears on hover only.
- No new code dependencies and no change to the content security policy.
  The only new third-party asset is a vendored font (see below).
  Animations use CSS and the browser's View Transitions API, without
  animation where it is not supported.
- One consistent visual design across all screens: list, login screen,
  header and account menu, dialogs and status bar, in light and dark mode.
- A visual language called "Einkaufszettel" (the paper shopping list the
  app replaces): calm surfaces, a sage-tinted neutral palette around the
  existing brand green, and one expressive moment, the strike-through
  drawn across an item when it is checked off.
- The font Atkinson Hyperlegible Next (SIL Open Font License), designed
  for legibility and clear about I/l/1 and O/0, is vendored into
  `pb_public/`. Item text grows from 16 to 17 px. All text meets WCAG AA
  contrast in light and dark mode.
- The design foundations are written down in `docs/design.md`; the values
  themselves live only in the CSS tokens of `app.css`.

List rows:

- Tapping anywhere on a row still checks it off or un-checks it.
- Each row shows only two buttons: claim (open items only) and a "more"
  button. The separate edit and delete buttons go away.
- The "more" button expands the row in place into an edit mode: the
  item's text in an editable field, with delete, cancel and save below it.
  Editing in the list instead of a dialog keeps the field above the phone
  keyboard, because the browser scrolls a focused field in the page into
  view, while a dialog fixed to the bottom would stay behind the keyboard.
  Enter saves and Escape cancels. Deleting stays online only.
- **BREAKING (behavior):** deleting an open item no longer asks for a
  separate confirmation. Opening the edit mode and pressing delete, with the
  item's text in view, is already a deliberate two-step action.
- A custom checkbox replaces the native one, so it looks the same in light
  and dark mode and on every platform.
- A claimed row gets a colored stripe on its leading edge plus a tint, kept
  within the list column; one's own claim stays stronger than someone
  else's.
- Checked-off items no longer show the creator and last editor line. Open
  items keep it as today.

Order and movement:

- After the user's own check-off or un-check, the row stays in place
  showing its new state for about 1.5 seconds without further taps in the
  list, then moves to its new position.
- Every reordering is animated, including changes made by other family
  members, so users can see where an item went. Changes from others are
  animated but not delayed.
- Checked-off items move into their own "Erledigt (n)" section below the
  open items. The section can be collapsed, is collapsed by default, and
  each device remembers whether it is open.

Rest of the app:

- The add button becomes a "+" icon button with an accessible label; the
  add field stays at the top, where the phone keyboard cannot cover it.
- While the app is connected and has nothing left to send, the status bar
  shows a single "Synchronisiert" indicator. In every other state it shows
  both indicators as today.
- The empty list gets a friendlier empty state with an icon and an
  inviting text.
- The login screen, header, account menu and dialogs are brought in line
  with the new design. What exactly changes there is settled in the design.
- Real-phone checks left open by the account menu change become tasks
  here: account menu and dialogs by touch, and a long list scrolling under
  the status bar.

Out of scope:

- Clearing all checked-off items at once. That stays in the separate change
  `add-clear-checked-items`, which comes after this one and adds its action
  to the header of the new "Erledigt" section.
- Moving the add field to the bottom of the screen, swipe-only actions and
  any change to data, sync or server behavior.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `shopping-list`: checked-off items in a collapsible "Erledigt" section;
  rows keep their place briefly after one's own change and reorder with
  animation; edit and delete move into an edit mode in the row, opened
  from a "more" button; no separate confirmation for deleting open items; claimed items
  highlighted with a stripe and tint; checked-off items no longer show
  creator and last editor.
- `offline-sync`: the status bar shows a single indicator while connected
  and fully synchronized, instead of always showing both.
- `web-app`: one consistent design across all screens in light and dark
  mode; legible type and WCAG AA text contrast; gestures only as shortcuts
  for visible buttons; dialogs without text input as bottom sheets on
  phones; compact add
  button.

## Impact

- `pb_public/index.html`, `pb_public/app.css`, `pb_public/js/app.js`: row
  markup, inline edit mode, "Erledigt" section, custom checkbox, animations,
  status bar, login screen, header, menu and dialogs.
- `pb_public/js/view.js`: grouping into open and checked-off items, meta
  line, status bar indicators; with unit tests.
- Delayed reordering needs a small DOM-free module or an extension of
  `view.js` that decides when a pending move is applied, with unit tests.
- `pb_public/js/storage.js` or a sibling module: the remembered collapsed
  state per device.
- E2E tests for rows, the inline edit mode, the "Erledigt" section, delayed
  reordering and the status bar need updating.
- No server or schema changes. New files in `pb_public/` (`hold.js`,
  `prefs.js`, the font file) go into `SHELL` in `sw.js`; the font's license
  text is added to the repository.
- New `docs/design.md`; `AGENTS.md` points to it for visual changes;
  `manifest.webmanifest` gets the new background color.
- The open placement question in `add-clear-checked-items` is answered by
  the "Erledigt" section header.
