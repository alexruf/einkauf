# Tasks

## 1. Header and add field as one sticky block

- [x] 1.1 Write failing e2e tests in `tests/e2e/layout.spec.mjs` on a 360 px phone with 40 items: after scrolling to the bottom, the app name, the account button and the add field are in the viewport with their tops at the same positions as before scrolling, and just above the header's bottom edge the header, not a row, is on top. Add a test that the header and the add field look as before at scroll 0: the add field is directly below the bar row and above the first row. Verify the scrolled test fails because the bar row scrolls away
- [x] 1.2 Move `#add-form` with its suggestions from `#list-screen` into the header in `pb_public/index.html`. Restructure the header as a full-width element with an inner centered column, like `.footer` and `.footer-inner`. In `showList` and `showLogin` in `pb_public/js/app.js`, set the form's `hidden` together with `#list-screen`. Verify that `tests/e2e/login.spec.mjs` passes and that the login screen shows no add field
- [x] 1.3 In `pb_public/app.css`, make the header `position: sticky; top: 0` with a `z-index` above the rows, a background of `color-mix(in srgb, var(--bg) 80%, transparent)`, the footer's blur, and a line at its bottom edge. Keep the safe-area top padding on the sticky element. Give the header a `view-transition-name`, so sliding rows stay beneath it during a transition, with a test in `tests/e2e/layout.spec.mjs`. Remove `position: sticky` from `.add` and give it `position: relative` so the suggestions stay anchored. Verify the tests from 1.1, `tests/e2e/suggestions.spec.mjs` and `tests/e2e/design.spec.mjs` pass in light and dark mode
- [x] 1.4 Add an e2e test to `tests/e2e/account-menu.spec.mjs`: with the list scrolled to the bottom, opening the account menu shows it below the user name and inside the viewport. Verify it passes, which shows that the header's blur does not move the menu
- [x] 1.5 Update `docs/design.md`: the header is a second bar beside the status bar, translucent on `--bg` with a line at the edge facing the list and no shadow, and it holds the add field. Explain why its base is `--bg` and not `--surface`. Verify the text matches the CSS from 1.3

## 2. Rows scrolled into view stay clear of the header

- [x] 2.1 Extend the test in `tests/e2e/duplicates.spec.mjs` where "Milch" is scrolled out of view: after adding "Milch", the row's top is at or below the bottom edge of the header. Add a test to `tests/e2e/edit.spec.mjs`: with the list scrolled so a row sits directly below the header, opening its edit mode leaves the edit form's top at or below the header's bottom edge. Verify at least the duplicate test fails with the current `scroll-margin-top: 5rem`
- [x] 2.2 Define the header's height once as a custom property in the `:root` tokens of `pb_public/app.css`, checked against the real height in `tests/e2e/layout.spec.mjs`, from the bar's top padding including the safe-area term, `--tap`, the bar's bottom padding and the add form's height. Use it for the rows' `scroll-margin-top`, plus a small gap, and for the account menu's `top` offset. Update the comment on `scroll-margin-top`. Verify the tests from 2.1, `tests/e2e/account-menu.spec.mjs` and the rest of `tests/e2e/duplicates.spec.mjs` pass

## 3. Flatter status bar

- [x] 3.1 Write failing e2e tests in `tests/e2e/layout.spec.mjs` on a 360 px phone: the status bar is at most 36 px high, and it has a `view-transition-name` so sliding rows pass beneath it. Verify the height test fails with the current padding
- [x] 3.2 In `pb_public/app.css`, set the footer's bottom padding to `max(0px, calc(env(safe-area-inset-bottom) - 1rem))`, the inner row's vertical padding to `0.3125rem`, and give the footer a `view-transition-name`, with comments explaining why the text may reach into the reserved area. Describe the flatter status bar in `docs/design.md`. Verify the tests from 3.1 and `tests/e2e/status-bar.spec.mjs` pass

## 4. Integration

- [x] 4.1 Add a step to the "Phone layout" check in `README.md`: scroll a long list in the installed app; the app name, the account button and the add field stay at the top and are not covered by the clock or the notch, and the rows pass beneath them visibly; the status bar's text stays clear of the home indicator. Verify that the README still describes current behavior elsewhere
- [x] 4.2 Run `make fmt` and `make test`. Verify that lint, unit, API and e2e tests all pass
- [x] 4.3 Check by hand on an iPhone with the installed app, in light and dark mode: the header stays clear of the notch when scrolled, the status bar's text stays clear of the home indicator, the keyboard does not cover the add field, and editing a row near the bottom of a long list moves it above the keyboard and below the header. Report the result to the user

## Workflow follow-up

- Verify the change, then archive it with `/opsx:archive` so specs, code and the archived change land in one commit.
