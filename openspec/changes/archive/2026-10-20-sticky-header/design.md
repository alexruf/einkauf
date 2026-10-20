# Design

## Context

The header (`header.bar` in `index.html`) is a centered column of
`max-width: 40rem` directly in `body`. The add form sits further down, inside
the list section in `main`, and is already `position: sticky; top: 0` with an
opaque `--bg` background. Because the two live in different parents, only
the form sticks. Its sticky range is the list section, so it stays up for the
whole list.

The status bar at the bottom (`.footer`) shows the pattern this change
follows. It is full width, uses `color-mix()` for a translucent background
with `backdrop-filter: blur(12px)` and a thin line on the edge facing the
list, and `.footer-inner` centers its content in the column.

The bar's height is already fixed by its content: a top padding of
`max(0.75rem, env(safe-area-inset-top))`, one row of `--tap` height for the
account button, and `0.25rem` below. The account menu's `top` uses the same
sum. The add form adds `0.75rem + 3rem + 0.75rem`. Rows use
`scroll-margin-top: 5rem` to stay clear of the sticky add field when they are
scrolled into view.

## Goals / Non-Goals

**Goals:**

- One sticky element for the header and the add field, so there is one
  background, one blur and no seam between the two.
- Keep page scrolling, so iOS keeps collapsing its toolbar, jumping to the top
  when the status bar is tapped, and moving an edited row above the keyboard.

**Non-Goals:**

- Collapsing or shrinking the header on scroll.
- Moving the notice line (`.status`) into the header. It stays below the
  header and scrolls with the page, as it does today.

## Decisions

### Move the add form into the header

The form moves from `#list-screen` into the header, below the existing bar
row. The header becomes a full-width `position: sticky; top: 0` element with
an inner column, like `.footer` and `.footer-inner`. The form keeps its id and
its children, so `app.js` keeps finding it by id. Because the form now sits
outside the list section, `showList` and `showLogin` toggle its `hidden`
together with `#list-screen`, the same way they already toggle `#account`.

Alternative: keep the DOM and make the bar sticky as well, with the add
field's `top` set to the bar's height. That needs no JS, but it gives two
layers. Each would blur its own backdrop, so a seam can show where they meet,
and any rounding difference in the computed height leaves a gap of a pixel
where rows show through. One element avoids both problems.

Alternative: make only the list scroll inside a fixed-height container. That
breaks the iOS behaviors listed under Goals and the browser's own scrolling
of an edited row above the keyboard. Rejected in the exploration.

### Background like the status bar, but based on `--bg`

The header uses `color-mix(in srgb, var(--bg) 80%, transparent)` with the
same blur as the footer and a line at its bottom edge. Its base is `--bg`
rather than the footer's `--surface`, because the add field itself is
`--surface`. On a `--surface` band the field would lose its edge, and before
any scrolling the top of the page would look different from today. No new
color token is needed, and there is no shadow: bars are flat, as in
`docs/design.md`.

The header is also sticky on the login screen, where it holds only the title.
There it shows the same bottom line. Both screens then use one header, which
matches the requirement for a consistent design.

### The safe area belongs to the header

The top padding with `env(safe-area-inset-top)` stays on the sticky element
itself. When it sticks at `top: 0`, its background covers the area behind the
system status bar, and its content starts below it. Today the add field
sticks at `top: 0` without that padding.

### Scroll margin from the header's height

`scroll-margin-top` on rows grows from `5rem` to the header's height plus a
small gap. The height is the sum of the bar and the form described under
Context, including the safe-area term. The value is defined once as a custom
property among the tokens in `:root`, together with the bar's height, so the
account menu offset and the scroll margin cannot drift apart. A test compares
it with the header's real height. The browser's scroll of an edited row above the
keyboard respects `scroll-margin` too, so one value covers both the duplicate
and the editing scenario.

### Stacking

The suggestion list stays absolutely positioned under the field. The form
loses `position: sticky` and needs `position: relative` to remain the
containing block. The header needs a `z-index` above the rows.

Rows slide to a new place with a view transition, and each row has its own
`view-transition-name`. While a transition runs, the browser draws those
rows in an overlay above the whole page, so they would cover the sticky
header for its duration. The header therefore gets a `view-transition-name`
of its own. It is then captured into the same overlay, where groups keep the
elements' paint order, and stays above the rows. During those 200 ms the
header is a snapshot without its blur, which is not noticeable.

### A flatter status bar

Most of the status bar's height on an iPhone is not its content but the
area reserved for the home indicator, about 34 px below the 37 px bar. The
bar has no controls, so nothing in it needs to be out of the indicator's
gesture area. Its bottom padding becomes
`max(0px, calc(env(safe-area-inset-bottom) - 1rem))`, and the vertical
padding of the inner row shrinks from 0.4375rem to 0.3125rem. On an iPhone
that leaves about 23 px between the text and the bottom edge, clear of the
indicator about 13 px above the edge, and saves about 20 px, close to half
of what the header costs. Devices without an inset keep no extra padding,
as before, and gain the 4 px of the inner row.

Alternative: drop the safe-area padding entirely. The text would then sit
on or right next to the home indicator, which looks cramped.

The footer also gets a `view-transition-name`, for the same reason as the
header: without it, sliding rows cover it while they move.

## Risks / Trade-offs

- [`backdrop-filter` makes the header the containing block for fixed
  descendants, and the account menu is `position: fixed` inside it] → The menu
  is a popover in the top layer, which is positioned against the viewport
  regardless of ancestors. An e2e check confirms that the menu still opens
  under the user name while the list is scrolled.
- [About one row less of list space on phones] → Accepted. The app is mostly
  used installed on phones, and the cost is the bar row of about 3.5rem.
- [With the keyboard open, the taller sticky block takes more of the small
  visible area] → Adding many items mostly happens on the desktop. A manual
  check on a phone with the keyboard open is part of the tasks.
- [The safe-area behavior of both bars cannot be tested in Playwright] → It
  is checked by hand on an iPhone with the installed app, and the item is
  added to the README's manual check list.

## Migration Plan

Frontend only. The service worker already caches `index.html` and `app.css`,
so a release delivers the change like any other. Rolling back means
releasing the previous version.
