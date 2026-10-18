# Design

## Context

See proposal.md for motivation and specs/ for the required behavior.

The frontend is static HTML, CSS and ES modules without a build step. A
strict CSP allows no inline scripts or style attributes in markup.
`app.js` only wires the DOM; logic lives in DOM-free modules with unit
tests. `render()` rebuilds every row from the snapshot plus the outbox
on each change and swaps them in with `replaceChildren`. The order comes
from `buildRows` in `view.js`: open items by creation time, then
checked-off items with the most recently checked first.

Every row is a `<label>` around a native checkbox, followed by claim,
edit and delete buttons. Deleting an open item uses its own confirmation
dialog; editing uses a separate dialog. The status bar always shows two
indicators. E2E tests find rows with `#items > li` and the row buttons by
their names "Bearbeiten" and "Löschen".

## Goals / Non-Goals

**Goals:**
- Keep `render()` as the single place that turns state into DOM. Holding
  rows in place and animating moves are both layered onto it, not built
  as a second rendering path.
- Keep all new decisions (what is held, what the status bar shows, which
  meta line a row gets) in DOM-free modules with unit tests.

**Non-Goals:**
- No change to the data model, the outbox, sync or any server code.
- No new icon set or images. Icons stay inline SVG in `index.html`. The
  vendored font is the only new asset.
- No new brand color and no new app icon: the green of the icon stays the
  accent, so the PNG icons need no regeneration.

## Decisions

### Holding rows by freezing their sort key

After the user's own check-off or un-check, the row must stay where it is
while showing its new state. `buildRows` gets an extra argument: a map
from item id to the sort key the item had before the first toggle in the
current burst (its old checked state and checked-off time). Rows in the
map are sorted, and assigned to a section, by that frozen key, but are
displayed with their current state. A row toggled twice keeps the key from
its first toggle, so checking off and un-checking again leaves it exactly
where it was.

A new DOM-free module `hold.js` owns the map and a single timer. Every
toggle by the user records the item's previous key if it is not held yet
and restarts the timer; when the timer fires, the map is cleared and the
module calls back so `app.js` re-renders. Timer functions and the delay
are injected so tests run without real waiting. The delay is 1.5 seconds.

Changes from other users never add to the map, so they move rows at once.
The one exception is a row in edit mode, which `app.js` keeps in the map
while the edit mode is open (see "Editing in the row").
A held row that someone else changes meanwhile still shows its newest
state and settles with the others when the timer fires.

Alternatives considered:
- Freezing the whole list during the hold. Simpler to explain, but it
  would also delay other users' changes, which the spec rules out.
- Remembering each held row's index and re-inserting it there. Breaks as
  soon as rows above it appear or disappear; the frozen sort key stays
  correct relative to all other rows.

### Animating with the View Transitions API

`render()` computes a layout key: the ids in their displayed order, plus
the section of each and whether the section is open. Only when the key
differs from the last render does it wrap the DOM update in
`document.startViewTransition`. Each row gets a `view-transition-name`
derived from its id (`item-<id>`, set through `element.style`, which the
CSP allows unlike a `style` attribute in markup). Ids are 15 characters
from a-z0-9, so the prefixed name is always a valid identifier. The
section header gets its own name, so it slides with the rows.

The transition is skipped when the API is missing, when the user prefers
reduced motion, and while the page is hidden. Its duration is short
(about 200 ms), because the page does not take input while a transition
runs.

Alternatives considered:
- A hand-written FLIP animation measuring every row before and after the
  update. Works in more browsers, but it is noticeably more code to keep
  correct together with the full re-render; the API covers the target
  phones (iOS 18 and current Android Chrome).

### "Erledigt" section

The list becomes two `<ul class="items">`: one for open items and one for
checked-off items inside a section. The section header is a `<button>`
with `aria-expanded` and `aria-controls`, showing "Erledigt (n)" and a
chevron. A `<details>` element was considered, because it brings
collapsing and keyboard support for free, but the later change
`add-clear-checked-items` puts an "Alle löschen" button into the header,
and a button inside `<summary>` is not reliably operable.

Whether the section is open is a device setting, not user data, so it does
not go into `storage.js`, whose data is discarded on logout. It lives
under its own localStorage key in a new small module `prefs.js`, following
the pattern of `app-name.js`. The default is collapsed.

The empty state is shown whenever there are no open rows, above the
section if there are checked-off items.

### Editing in the row instead of a dialog

The "more" button (three dots, accessible name "Mehr") switches its row
into an edit mode in place. The row renders from a second template: a text
field with the item's text, and below it a delete button on the leading
side and "Abbrechen" and "Speichern" on the trailing side. This follows the
platform conventions: macOS dialogs put the default action rightmost,
cancel next to it and a destructive action apart on the far left, and
Material dialogs also end with the confirming action. On a phone, saving
sits under the thumb and deleting is furthest away from it. The delete
button is a square trash-can icon button with the accessible name
"Löschen", in the same shape as the other two and tinted in the danger
color. A red text link next to two real buttons looked like a different
kind of control, and three labelled buttons did not fit a 320 px row. Enter saves and Escape
cancels. Opening another row's edit mode cancels the current one. While
the app is not online, "Löschen" is disabled and a short hint says that
deleting only works online. The separate delete confirmation dialog and
the edit dialog are removed.

A dialog was the first plan, shown as a sheet at the bottom on phones.
The phone keyboard covers such a sheet: iOS shrinks only the visible area,
so anything fixed to the bottom stays behind the keyboard, and lifting it
with a `visualViewport` listener lags behind the keyboard and could not be
verified on Android. A field that sits in the normal page flow has none of
these problems, because browsers scroll a focused field into the visible
area above the keyboard on every platform. Editing in place also keeps the
neighbouring items in view, which makes a mistaken row obvious.

Focus on opening: the field takes focus at once, with the cursor at the end
of the text, on the desktop and on touch devices alike, so the user can type
right away. The first plan kept the phone keyboard closed until the field was
tapped, so that deleting would not bring it up; on the iPhone, opening an
item and then having to tap the field again felt like a needless step, and
the delete button stays reachable above the open keyboard. iOS only opens
the keyboard for focus set during the tap itself, so the edit mode opens
without an animated render. After the field is focused,
`scrollIntoView({ block: 'nearest' })` keeps the row clear of the sticky add
field at the top.

Surviving re-renders: `render()` rebuilds all rows on every change. The
edit state lives in `app.js` as `{ id, draft, selectionStart,
selectionEnd, focused }`, updated on input. `render()` draws the edited row
from the edit template with that state and restores the selection and
focus, so typing is not interrupted when someone else changes the list.
The edited item is also put into the hold (see above) for as long as the
edit mode is open, so it keeps its position even when someone else checks
it off; closing the edit mode releases it with the normal hold delay. When
the edited item disappears, the edit mode closes. The reload after a new
deployment counts an open edit mode as an entry in progress and waits.

### Dialogs as bottom sheets on phones

Only dialogs without text input remain: the logout confirmation. Below
40rem viewport width it is anchored to the bottom with full width, rounded
top corners and padding for the home indicator; above it is centered as
today. Escape and the cancel button close it, as native `<dialog>` already
does. Because no dialog takes text input, the phone keyboard never
overlaps a sheet, and no viewport listener is needed.

### Row layout and controls

- Rows: text column, then the claim button (open items only) and the
  "more" button, each with a 44 px tap target. The `<label>` keeps the
  whole remaining area as the check-off target.
- Checkbox: the native input with `appearance: none`, 26 px with an 8 px
  radius, drawn with a border in the muted color; checked, it is filled
  with the accent color and shows a check mark from a `data:` SVG
  background (allowed by the CSP's `img-src`), with one image per color
  scheme. The focus ring stays.
- Rows are at least 56 px high. The separator line starts where the text
  starts, not under the checkbox, which makes the list calmer.
- Strike-through: the item text carries a 2 px line as a background
  gradient whose width animates from 0 to 100 % (about 250 ms) when the
  row is rendered as just checked off by the user. A `text-decoration`
  cannot be animated that way. `render()` marks only rows the user just
  checked off, so rows checked off by others or re-rendered later show
  the full line without animation.
- Claim: every row reaches half a gutter past the column on both sides
  (negative inline margin) and gets the same padding on its leading side,
  so a claimed row can show an inset stripe (`box-shadow` on the leading
  edge) and a tint without shifting its content, and all rows share the
  same edges. The tint
  for others' claims gets stronger in dark mode, where 9 % was barely
  visible.
- Meta line: `buildRows` returns an empty meta for checked-off rows, and
  empty meta lines are not shown.
- Add button: an icon button with a plus SVG and `aria-label`
  "Hinzufügen", square at the tap size.

### Status bar

`connectionIndicator` gets the pending count, so `view.js` alone decides
that the connection indicator is hidden while online with nothing
pending. The sync indicator is unchanged.

### Visual language "Einkaufszettel"

The app should look like what it replaces: a paper shopping list that
gets crossed off. That gives one rule for boldness: the strike-through
when checking off is the only expressive motion; everything else is calm
and only moves to show where something went. The preview reviewed with
the user shows the result in both modes.

Palette (light / dark), all text pairs at WCAG AA or better:

| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | `#F1F4F1` | `#151A17` | page behind the list |
| `--surface` | `#FFFFFF` | `#1E2420` | fields, sheets |
| `--raised` | `#FFFFFF` | `#242B26` | menu, sheets above the page |
| `--text` | `#16201A` | `#E6ECE8` | items, titles |
| `--muted` | `#5C6860` | `#9AA59E` | meta line, checked-off items |
| `--line` | `#DCE3DD` | `#2B332E` | separators, field borders |
| `--accent` | `#2F7D4F` | `#6FC191` | checking off, primary button |
| `--claim` | `#2C66B8` | `#7FAEEA` | claim stripe and tint |

The neutrals lean slightly towards the brand green instead of the warm
cream used today, so background and accent belong together. The claim
tint is 8 % / 15 % (others / own) in light mode and 14 % / 24 % in dark
mode, where lower values were barely visible. Danger, warning and the
notice colors keep their current roles and are only checked for contrast.

Type: Atkinson Hyperlegible Next, vendored as one variable `woff2` file
(Latin subset) in `pb_public/vendor/` with `font-display: swap` and the
system font stack as fallback. It was chosen over the system fonts for
legibility (I/l/1 and O/0 are distinct, which matters for "Milch 1l")
and because it gives the app a recognizable voice. The OFL license text
is kept next to it in the repository. Scale:

| Role | Size / weight |
|---|---|
| App name | 28 px / 800, slightly tightened |
| Item text | 17 px / 400 |
| Section header, buttons | 15–16 px / 600 |
| Meta line | 14 px / 400 |
| Status bar | 12 px / 400 |

No text is set in capitals; labels are written in sentence case.

Shape and depth: radius by role, not one radius everywhere: 12 px for
fields and buttons, 20 px for sheets and the menu, 8 px for the checkbox.
Shadows only for layers that float above the page (menu, sheets); rows
stay flat, without cards.

Alternatives considered:
- Keeping the system fonts. Zero cost and SF Pro is very legible on
  iPhones, but the app would keep looking like any other web page, and
  Android and desktop fonts differ more.
- A new brand color. It would need a new icon set and gives little the
  palette and type do not already give.

### Where the design foundations live

The values exist once, as custom properties in the `:root` blocks of
`app.css`, with short comments on their role. `docs/design.md` explains
the rules behind them for humans and agents: the idea, palette roles,
type scale, shapes, motion rules and do's and don'ts, in about one page.
`AGENTS.md` gets one line pointing to it. Specs hold only what can be
tested: contrast, text size, reduced motion, tap targets. Specs are not
used for colors or mood, because they describe behavior.

### Consistent design across screens

All screens use the tokens above: surface and raised colors, the radius
per role, one shadow for floating layers (menu, sheets), and the tap size.

- Header: the app icon (`/icons/icon.svg`, already cached) next to the app
  name, so the list screen has a visual identity; the account button
  keeps its place.
- Login screen: same card, field and primary button styles as the
  dialogs; the primary button spans the full width.
- Account menu: same raised surface, radius and shadow as the sheets; menu
  items keep the 44 px height.
- Dark mode: the accent fill of primary buttons is slightly toned down,
  so the add button and checked checkboxes do not outshine the text.
- `manifest.webmanifest`: `background_color` becomes the new light `--bg`;
  `theme_color` stays the brand green.

## Risks / Trade-offs

- [The page ignores taps while a view transition runs] → Transitions only
  start when the layout actually changes and last about 200 ms. With the
  hold, a burst of taps produces one transition at its end, not one per
  tap.
- [A transition starting while the user scrolls looks jumpy] → Accepted;
  it only happens when someone else changes the list at that moment.
- [Re-rendering while typing loses the cursor or IME composition] → The
  edit state keeps draft and selection and `render()` restores them. A
  re-render during an active IME composition (for example dictation)
  could still interrupt it; if that shows up, `render()` skips replacing
  the list while the field reports `isComposing` and renders once the
  composition ends.
- [The edited row near the bottom is hidden by the keyboard] → Browsers
  scroll a focused in-flow field into view; checked on the iPhone.
  Android is not checked on a device (none available), but this is
  standard browser behavior with no platform-specific code.
- [E2E tests rely on the old row buttons, the delete confirmation, the
  edit dialog and `#items > li`] → The shared row helpers move to a selector covering
  both lists; tests that touch checked-off items expand the section
  first; tests that check order after a toggle wait for the hold to end
  instead of asserting at once.
- [The font file makes the first load heavier and could flash the
  fallback] → One Latin-subset variable file, cached by the Service
  Worker with the app shell; `font-display: swap` keeps text visible
  while it loads; the system font stack is the fallback.
- [Deleting an open item no longer asks again] → Deleting needs two
  deliberate taps with the item's text visible in between, and it is
  online only. Accepted as agreed in the proposal.
- [The collapsed section hides a mistaken check-off] → During the hold
  the row is still visible and can be un-checked in place; afterwards the
  count in the header shows where it went.

## Migration Plan

Frontend-only. Deploying the new files is enough; the running app picks
up the version through the existing update mechanism. The new prefs key
starts empty, so every device starts with the section collapsed. Rollback
is a redeploy of the previous tag; the leftover prefs key is ignored by
the old version.
