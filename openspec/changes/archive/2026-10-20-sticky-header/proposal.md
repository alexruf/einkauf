# Proposal

## Why

When the list is scrolled, the status bar at the bottom stays in place, but
the header with the app name and the account menu scrolls away. The add
field moves up with it by the header's height and then sticks at the top
without a visible edge, so rows vanish into the page background. The top and
the bottom of the screen follow different rules, and that feels odd. The app
runs mostly as an installed app on phones, where it costs only about one
row of list space to keep the whole header in view.

## What Changes

- On the list screen, the header row (app name and account button) and the
  add field form one block that stays at the top while the list scrolls.
  The page itself keeps scrolling as a whole; there is no inner scroll
  container.
- The block is a visible layer like the status bar: translucent with a
  blur and a thin line at its bottom edge, so rows can be seen passing
  beneath it. It spans the full width, with its content aligned to the
  centered column.
- The block includes the top safe area, so on phones with a notch its
  content stays clear of the system status bar.
- Rows that the app scrolls into view, such as an existing item when a
  duplicate is added, and rows the browser scrolls into view for editing,
  end up below the block instead of under it.
- Suggestions still float below the add field over the list.
- The status bar at the bottom becomes flatter to win back some of the
  space the header now keeps. It has no buttons, so on phones with a home
  indicator its text may reach into part of the area reserved at the bottom
  of the screen, while staying clear of the indicator itself.
- Rows that slide to a new place stay beneath both bars while they move.
- Out of scope: hiding or shrinking the header while scrolling, moving the
  notice line ("steht schon drauf") into the header, and any change to the
  login screen besides what the shared header implies.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `web-app`: a new requirement that the header and the add field stay in
  view at the top of the list screen, clear of the system status bar, and
  that rows scrolled into view are not hidden beneath them; and a new
  requirement that the status bar takes little height.

## Impact

- `pb_public/index.html`: the add form moves from the list section into the
  header, so one element can stick and carry one background.
- `pb_public/js/app.js`: `showList` and `showLogin` show and hide the add
  form together with the list, as they already do for the account button.
- `pb_public/app.css`: the header becomes a full-width sticky layer with an
  inner column; the add field is no longer sticky on its own; the scroll
  margin of rows grows to the header's height; the status bar gets less
  padding, and both bars get a view transition name.
- Tests: e2e tests for the header staying in view while scrolling, for
  a duplicate's row ending up below the header, and for the status bar's
  height.
- Docs: `docs/design.md` describes the header as a second bar beside the
  status bar.
- No new dependency, no schema or server change.
