# Proposal

## Why

New family members get the app as a plain link and usually open it in the
phone browser. Installing it to the home screen works, but the steps differ
between iOS and Android and are not obvious, so the administrator has to
explain them separately every time. A short hint on the login screen lets the
link speak for itself.

## What Changes

- Add a collapsible hint ("App installieren") to the login screen, closed by
  default, so it does not get in the way of logging in.
- When expanded, it shows short German step-by-step instructions for adding
  the app to the home screen on iPhone/iPad (Safari) and on Android (Chrome).
- The hint is static content: no new scripts, no third-party code, no change
  to the content security policy.
- The hint is not shown when the app already runs as an installed app
  (standalone mode).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-app`: adds a requirement that the login screen explains how to install
  the app on phones, next to the existing "Installable as an app" requirement.

## Impact

- `pb_public/index.html`: new collapsible hint inside the login screen.
- `pb_public/app.css`: styling for the hint.
- `pb_public/js/app.js`: possibly hiding the hint in standalone mode (DOM
  wiring only).
- E2E test for the login screen covering the hint.
- No backend, schema, API, or dependency changes.
