# Proposal

## Why

The app header and the browser title always read "Einkauf" because the name is
hard-coded in `index.html`. The PocketBase admin UI already has an
"Application name" setting, but changing it has no effect on the app. Fresh
installations also start with PocketBase's default name "Acme", so the admin
UI and the e-mails PocketBase sends show a name that does not match the app.

## What Changes

- The app shows the application name from the PocketBase settings in its
  header and as the document title, instead of a fixed "Einkauf".
- A new public, read-only endpoint provided by a JS hook returns only the
  application name. The full settings API stays restricted to superusers.
- The app remembers the last known name locally, so it shows the correct name
  offline and on startup before the server answers. Until a name has been
  loaded once, it falls back to "Einkauf".
- A new migration sets the application name to "Einkauf" on installations that
  still use PocketBase's default name. A name an admin already set is kept.
- Out of scope: the installed app's name in `manifest.webmanifest` stays
  static. Browsers read it at install time and cache it, so making it dynamic
  would add complexity with little visible benefit.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `web-app`: adds a requirement that the displayed app name comes from the
  server's application name setting, with "Einkauf" as the default for new
  installations and as the offline fallback.

## Impact

- `pb_public/index.html`, `pb_public/js/app.js`, plus storage of the cached
  name (likely `pb_public/js/storage.js`).
- New route in `pb_hooks/` (for example `GET /api/app-name`, no auth).
- New migration in `pb_migrations/` that changes settings only, with a down
  migration that restores "Acme" if the name is still "Einkauf".
- Tests: unit tests for name caching and fallback, an API test for the new
  route and the migration default, and an e2e test that the header follows
  the setting. Existing e2e checks on the title "Einkauf" must keep passing.
- No new dependencies, no schema change to collections.
