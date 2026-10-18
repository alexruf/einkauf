# Design

## Context

- The version shown in the status bar comes from `pb_public/js/version.js`,
  which `make release` writes and which is deployed together with the
  server. It is always the version of the code running on the device.
- The Service Worker answers the app's own files network-first and stores
  every response it gets in one shared cache. After 3 s without an answer
  it falls back to that cache.
- `PB_CONNECT` fires on every (re)connect of the realtime connection
  (`connectRealtime()` in `app.js`). A deployment restarts the server, which
  breaks every open connection. An app coming back from the background
  usually reconnects too. Realtime runs only while a user is logged in.
- The outbox lives in `localStorage`, and sending an operation twice is
  harmless (`sync.js` treats a duplicate create as done), so a reload never
  loses or duplicates pending changes. What a reload can lose is text that
  has not reached the outbox: the input field for new items and open
  dialogs. A reload can also abort a running delete request, because
  deleting does not go through the outbox.

## Goals / Non-Goals

**Goals:**

- Detect a new deployment without new server code.
- Make all reload decisions in a DOM-free module that has unit tests.

**Non-Goals:**

- Checking on the login screen. That screen was just loaded fresh, and
  logging in starts realtime, which runs the check.
- Polling on a timer. Reconnecting already covers deployments and returning
  from the background.

## Decisions

### Check the version on `PB_CONNECT` by fetching `version.js`

The `PB_CONNECT` handler also starts a version check. The check runs
`fetch('/js/version.js', { cache: 'no-store' })` and reads the version from
the text with the same pattern `scripts/release.sh` uses. Any failure, such
as a network error, a non-OK status or text that does not match, ends the
check without a reload and only logs a warning. The next reconnect checks
again.

Alternatives considered:

- *A hook route `/api/einkauf/version`*: needs server code that reads a
  frontend file, or a second copy of the version that `make release` would
  have to keep in sync. Fetching the file is enough.
- *Sending the version in a custom realtime message*: possible with the
  subscriptions broker, but the reconnect is already the signal and the
  file already holds the version.
- *`import('/js/version.js')`*: the browser keeps imported modules, so a
  second import returns the old value. Adding a query string to get around
  that would add a cache entry in the Service Worker.

### The Service Worker leaves `no-store` requests to the network

In the `fetch` handler, requests with `request.cache === 'no-store'` are not
handled, the same way `/api/` is not. The check therefore never gets an old
answer from the cache. The more important effect is that it never writes
into the cache: a new `version.js` stored next to the old `app.js` would
make the next offline start run mixed versions. Offline, the request simply
fails, which ends the check.

Alternative considered: a dedicated path or query string that the Service
Worker skips. That is a second naming convention. `no-store` already says
"do not cache this", so the Service Worker only honors what the request
asks for.

### `update.js` decides, `app.js` acts

New DOM-free module `pb_public/js/update.js`, injected with a storage
backend like `app-name.js`:

- `parseVersion(text)` returns the version string or `null`.
- `createUpdater({ running, backend })` returns `found(deployed)`, which
  remembers a deployed version that differs from the running one and has
  not been reloaded for yet, and `takeReload(busy)`. `takeReload` returns
  `true` when a reload is pending and `busy` is `false`, and records the
  version in `backend` before returning, so it is reloaded for only once.

`app.js` computes `busy` and calls `location.reload()` when `takeReload`
returns `true`.

### "Busy" and when to check again

`busy` is true while any of these holds:

- `#new-item` contains non-whitespace text.
- Any `dialog[open]` exists.
- A delete request is running. A counter in `deleteItem` tracks this.

A pending reload is attempted:

- right after the version check found a new version,
- after the add form was submitted (`addItem` has already put the item into
  the outbox),
- after any of the dialogs closed, in a `close` listener registered once at
  startup. That listener runs before the per-dialog `once` listeners, so the
  attempt is postponed with `setTimeout(…, 0)`. A delete started by the
  confirmation dialog then counts as running,
- when a running delete finishes.

Reloading when the app goes to the background was considered and dropped.
It would discard half-typed text, and returning reconnects and checks again
anyway.

### Loop guard in `sessionStorage`

The version the app last reloaded for is stored in `sessionStorage`. Its
lifetime is one tab or app window, and it survives the reload itself. The
spec asks for at most one reload per version and window. Storing the guard
in `localStorage` would also suppress the reload in a second tab.

## Risks / Trade-offs

- [The realtime connection survives a short background phase, so there is
  no reconnect and no check] → The check runs on the next reconnect. This is
  no worse than today, and in practice phones drop the connection in the
  background.
- [Mixed versions after a reload, when the Service Worker's 3 s fallback
  serves some old files] → The loop guard prevents repeated reloads. The
  next deployment or reconnect fixes it.
- [A reload aborts a running list reload or flush] → Harmless. The outbox
  keeps every operation until the server confirms it, and the list is
  reloaded after the restart.
- [Every reconnect costs one small extra request] → Negligible.

## Migration Plan

Nothing to migrate. Only clients running this version or a later one reload
by themselves. Phones still running an older version pick up this release
the old way, once the app is opened fresh.
