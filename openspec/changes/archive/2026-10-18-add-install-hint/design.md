# Design

## Context

The login screen is a static `<section id="login-screen">` in
`pb_public/index.html` holding a single form. `app.js` only toggles its
visibility. The content security policy forbids inline scripts and styles, so
any new behavior has to live in `app.css` or a module under `pb_public/js/`.
The app is already installable (manifest with `display: standalone`, apple
touch icon), so this change only adds an explanation; see proposal.md for the
motivation and the `web-app` spec delta for the required behavior.

## Goals / Non-Goals

**Goals:**

- Ship the hint as markup and CSS only, with no new JavaScript and no new
  files.
- Keep the login form as the first and dominant element on the screen.

**Non-Goals:**

- Triggering the browser's own install prompt (`beforeinstallprompt`). It only
  exists in Chromium browsers, never on iOS, and would need extra JS state.
- Detecting the platform and showing only the matching instructions.
- Instructions for browsers other than Safari on iOS and Chrome on Android.

## Decisions

### Native `<details>`/`<summary>` for the collapsible hint

The hint is a `<details class="install-hint">` with the summary
"App installieren", placed below the login form inside the login section.
`<details>` is closed by default, opens and closes without any script, works
with keyboard and screen readers, and is unaffected by the CSP.

Alternative: a button that toggles a hidden block from `app.js`. Rejected
because it adds JS wiring and ARIA state handling for something the browser
already provides.

### Show both platforms side by side instead of detecting the platform

The expanded hint lists two short ordered lists, one headed "iPhone / iPad
(Safari)" and one "Android (Chrome)". Users find their own platform at a
glance.

Alternative: user-agent detection to show only the relevant list. Rejected
because user-agent sniffing is unreliable (iPads report as macOS, for
example) and would add DOM-free logic plus tests for little benefit.

### Hide the hint in standalone mode with a CSS media query

`@media (display-mode: standalone) { .install-hint { display: none; } }` in
`app.css`. Both iOS Safari and Android Chrome report `display-mode:
standalone` for home-screen apps started from this manifest, so no JS check
of `navigator.standalone` is needed.

Alternative: a check in `app.js` that sets `hidden`. Rejected because CSS
covers both target platforms and keeps `app.js` untouched.

### Wording of the steps

German, short, and naming the exact menu labels the user sees:

- iPhone / iPad (Safari): tap the share button, choose "Zum Home-Bildschirm",
  confirm with "Hinzufügen".
- Android (Chrome): open the menu (three dots), choose "App installieren" or
  "Zum Startbildschirm hinzufügen", confirm.

## Risks / Trade-offs

- [Browser menu labels change over time or differ between versions] → The
  steps name both common Android labels; wording is plain copy and cheap to
  update.
- [Standalone hiding is hard to test end to end, because Playwright has no
  option to start a page in standalone display mode] → Emulate the media
  feature through the Chromium DevTools protocol
  (`Emulation.setEmulatedMedia` with `display-mode: standalone`) in the e2e
  test. If the pinned Chromium does not support that feature, check the rule
  manually on a phone and record it with the existing manual checks.
- [Hint pushes the form down on small screens] → It sits below the form and
  is collapsed by default, so only the summary line takes space.
