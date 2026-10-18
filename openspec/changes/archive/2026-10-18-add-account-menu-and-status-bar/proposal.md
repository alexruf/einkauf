# Proposal

## Why

The "Abmelden" button sits next to the user name in the header and is as prominent as anything on the screen, although a family member logs in once and then rarely logs out. One accidental tap deletes the local list and, worse, any changes that have not reached the server yet. At the same time the app gives no calm, permanent hint about whether the list on screen is current, and there is no way to tell which version of the app a device is running, which makes it hard to check whether an update has arrived on a phone.

## What Changes

- The logged-in user's display name stays visible in the header and becomes the trigger of a drop-down menu that clearly sits above the page. "Abmelden" moves into that menu.
- Logging out always asks for confirmation in a dialog, like deleting an open item does. When changes are still pending, the dialog says how many will be lost.
- A status bar at the bottom of the screen shows two indicators, each a colored dot with a short text: the connection to the server (connecting, connected, offline) and the synchronization state (synchronized, changes being sent, or, while not connected, the time up to which the list is known to be current).
- The status bar also shows the app version. The version is a calendar version in the form `YYYY.0M.0D.MICRO` (for example `2026.10.18.0`), kept in a tracked file in the frontend and raised by hand before each deployment.
- The offline notice at the top stays as it is.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `user-auth`: logout moves into a menu opened from the user's display name and requires confirmation, with a warning about pending changes.
- `offline-sync`: a permanent status bar shows the connection state and the synchronization state as indicators, including the time of the last synchronization while not connected.
- `web-app`: the app shows its version, which follows a calendar versioning scheme.

## Impact

- `pb_public/index.html`: account menu in the header, logout confirmation dialog, status bar.
- `pb_public/app.css`: menu, status bar and spacing at the bottom of the page, including the safe area on phones.
- `pb_public/js/app.js`: wiring for the menu, the logout dialog and the status bar.
- New DOM-free logic with unit tests: state and text of the status bar indicators, logout confirmation text, and the app version in a new `pb_public/js/version.js` (added to `SHELL` in `sw.js`).
- `pb_public/js/sync.js` / storage: remember when the last synchronization succeeded.
- E2E tests that click "Abmelden" directly (`session.spec.mjs`, `csp.spec.mjs`) must open the menu and confirm first.
- `README.md`: raising the version becomes a step before deploying.
- No backend, schema or dependency changes.
