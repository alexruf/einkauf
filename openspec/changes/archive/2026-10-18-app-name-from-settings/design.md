# Design

## Context

See proposal.md for the motivation and specs/web-app/spec.md for the
requirements.

The current state that shapes the approach:

- The name "Einkauf" is hard-coded twice in `pb_public/index.html`: in
  `<title>` and in the header's `<h1>`.
- PocketBase stores the name as `meta.appName` in its settings. Only superusers
  may read `GET /api/settings`. A new PocketBase installation uses the default
  name "Acme".
- The service worker deliberately ignores `/api/`. Everything the app needs
  offline lives in `localStorage`.
- `storage.js` holds data that belongs to one user. It is wiped on logout and
  when another user logs in. The app name is not user data and must survive
  both, and it is also needed on the login screen before anyone has logged in.
- Custom routes already live under `/api/einkauf/`, for example the cleanup
  route in `pb_hooks/cleanup.pb.js`.

## Goals / Non-Goals

**Goals:**
- Read the name with one small unauthenticated request that returns nothing
  except the name.
- Show a cached name immediately at startup, so the title does not jump from
  "Einkauf" to the configured name on every start.

**Non-Goals:**
- Live updates while the app is open. A changed name shows up the next time
  the app starts, which is enough for a setting that almost never changes.
- Using the name in the web app manifest or the service worker.

## Decisions

### A public hook route returns only the name

`GET /api/einkauf/app-name` is added in a new `pb_hooks/app-name.pb.js` with no
auth middleware. It responds with `{ "name": <meta.appName> }`.

Alternatives considered:
- Loosening access to `/api/settings`: not possible without exposing SMTP,
  S3 and backup settings, so it was rejected.
- Rendering the name into `index.html` on the server: PocketBase serves
  `pb_public/` as static files. Templating would mean a custom route for `/`
  that replaces the static handler, and that would interfere with the service
  worker's network-first caching of `/`. It was rejected as too invasive.
- Putting the route in an existing hook file: neither `items.pb.js` nor
  `cleanup.pb.js` fits by topic, so a separate file keeps each file to one
  responsibility.

The existing `/api/` rate limit also covers the new route. That limit is
generous, and the app makes one request per start.

### The name is cached in its own DOM-free module

A new module `pb_public/js/app-name.js` wraps a localStorage-like backend under
its own key (`einkauf-app-name`), separate from the user-scoped `einkauf` key.
It offers two operations: one returns the stored name or the fallback
"Einkauf", and one remembers a name. Empty or non-string values are ignored,
so a broken response can never blank out the header. Unit tests cover the
fallback, remembering a name and ignoring invalid values. This follows the
project rule that logic lives in DOM-free modules with unit tests, and the
module is added to `SHELL` in `sw.js`.

Extending `storage.js` instead was rejected. Its `clear()` and `claim()`
semantics are tied to the logged-in user, and the name must not follow them.

### Wiring in app.js

At startup, before the first screen is shown, `app.js` applies the cached name
to the header and to `document.title`. It then calls
`pb.send('/api/einkauf/app-name')`. If the request succeeds, it remembers the
name and applies it again. If the request fails, the cached name stays and the
error is not shown to the user, because the name is not essential and the app
already reports offline state elsewhere. The static "Einkauf" in `index.html`
remains as the text shown before the script runs.

### The default is set by a settings-only migration

A new migration sets `meta.appName` to "Einkauf" only if it is still "Acme".
The down migration sets it back to "Acme" only if it is still "Einkauf". This
matches the existing settings migration `1792264700_enable_rate_limits.js`.
Both the "Acme" default and the `settings.meta.appName` field must be
verified against PocketBase 0.40.5 during implementation.

## Risks / Trade-offs

- [The e2e test in `tests/e2e/service-worker.spec.mjs` detects a new deployment
  by editing `<title>` in `index.html`. After this change, `app.js` overwrites
  the title with the server's name, so the test would fail.] → Change the test
  to use a marker that `app.js` does not touch, such as an extra attribute or
  element in the edited `index.html`. The test's purpose stays unchanged.
- [The name is shown in two places, the header and the title, and a third
  place could be forgotten later.] → One function in `app.js` applies the name
  to both places.
- [An admin who wants the name "Acme" will have it changed by the migration.]
  → This is accepted. The migration runs only once, so setting "Acme" again
  afterwards sticks.
- [The installed app's name on the home screen still comes from the static
  manifest.] → This is accepted and recorded as a non-goal in the proposal.

## Migration Plan

Deployment works as usual. The migration runs on startup and changes only the
settings, not the collection schema. Rollback uses the down migration, and
keeping the old frontend is harmless because it ignores the new route.
