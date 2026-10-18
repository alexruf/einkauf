# Proposal

## Why

After a release, the installed app on a phone keeps running the old version.
Every load already fetches the newest files, but an installed app is rarely
loaded again: coming back from the background resumes the old page, and
there is no reload button in standalone mode. So "the next start of the app"
may never come, and family members keep using old code against the updated
server.

## What Changes

- Whenever the realtime connection is (re)established, the app checks the
  version that is currently deployed. A deployment restarts the server, so
  every open app reconnects afterwards; coming back from the background also
  reconnects. The check needs no new server code: the app re-fetches
  `/js/version.js`, the same file that provides the version in the status
  bar, and compares it with the version it is running.
- If the deployed version differs, the app reloads itself, but only at a
  moment when nothing gets lost: not while the input field contains text and
  not while a dialog is open. Otherwise it waits until the item has been
  added or the dialog has been closed, and reloads then. Unsent changes are
  safe either way, because the outbox survives a reload.
- The app reloads at most once per deployed version, so a failed update
  cannot cause a reload loop.
- Out of scope: a visible "new version" notice, release notes in the app,
  and pushing the version through a custom realtime message.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `web-app`: adds that a running app picks up a new deployment by itself,
  without interrupting an entry in progress and without a reload loop.
  "New versions reach users" stays as it is; it covers opening the app.

## Impact

- `pb_public/js/app.js`: version check on `PB_CONNECT`, the reload, and
  waiting for a safe moment.
- A new DOM-free module `pb_public/js/update.js` for reading the version
  from the fetched file and deciding whether to reload, with unit tests;
  added to `SHELL` in `sw.js` and to the module list in `AGENTS.md`.
- `pb_public/sw.js`: leaves the check request to the network, so it is
  never answered from the cache and never written into it.
- Tests: unit tests for the decision, e2e for reload after a version change
  and for waiting while the input field contains text.
- No server code, no schema change, no new dependencies. `make release` and
  `version.js` stay as they are.
