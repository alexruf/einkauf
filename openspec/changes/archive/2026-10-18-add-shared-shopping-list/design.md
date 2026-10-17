# Design

## Context

See proposal.md for motivation. The repository has PocketBase 0.40.5 pinned in `flake.nix` and `compose.yaml`, empty `pb_hooks/` and `pb_migrations/`, and a placeholder `pb_public/index.html`. There is no test harness and no Node.js in the dev shell. Project rules forbid npm, bundlers and CDNs for the frontend, require every schema change to be a migration, and require hook and migration APIs to be checked against the pinned PocketBase version rather than assumed.

PocketBase brings auth, API rules, realtime over SSE and JS hooks, including cron. It has no offline support, and SSE does not replay events missed while disconnected.

## Goals / Non-Goals

**Goals:**

- One write path for online and offline, so the offline case is not a rarely exercised branch.
- Enforce security on the server through API rules and hooks; the client is never trusted.
- Keep client logic in DOM-free ES modules so Node can test it directly.
- Make every spec scenario that can be automated part of `make test`.

**Non-Goals:**

- Conflict resolution beyond last-write-wins on the checked state. Offline operations are limited to create and set-checked, which cannot really conflict.
- Background sync while the app is closed. iOS does not support it; the app syncs while it is open.
- Multiple households per deployment. Every account in the `users` collection is a family member.

## Decisions

### 1. Data model: built-in `users` plus one `items` collection

`users` is the auth collection PocketBase creates by default. A migration changes its rules: create and delete are superuser-only (rule `null`); list and view are allowed for any authenticated user so names can be shown; update stays limited to the user's own record. `emailVisibility` stays off, so other users' emails are never returned. The default `name` field becomes required with a maximum of 30 characters, so every account has a display name such as "Mama" and the UI never needs the email as a fallback. PocketBase does not trim text fields, so a pattern rejects leading and trailing whitespace instead; this also rules out names made only of spaces. The administrator sets the name in the admin UI; changing it from within the app is out of scope.

`items` fields:

| Field | Type | Notes |
|---|---|---|
| `id` | text | Default pattern (15 chars, `a-z0-9`). The client may supply it. |
| `text` | text | required, max 200 |
| `checked` | bool | |
| `checkedAt` | date | set and cleared by a hook; drives cleanup |
| `createdBy` | relation to `users` | not required, no cascade; set by a hook |
| `updatedBy` | relation to `users` | not required, no cascade; set by a hook |
| `created`, `updated` | autodate | |

The relations are deliberately optional. When the administrator deletes an account, PocketBase clears the reference instead of blocking the delete, and the UI shows "Unbekannt".

Later features fit in as additional optional fields (`owner` for private lists, `claimedBy` for "besorge ich") without migrating data. The alternative was a `lists` collection now; it was rejected because nothing in this change needs it.

API rules for `items`, where `A` = `@request.auth.collectionName = "users"`:

- list, view, create, delete: `A`
- update: `A && @request.body.text:isset = false`

Checking `collectionName` instead of just `@request.auth.id != ""` also rejects tokens from any other auth collection. Superusers bypass rules as usual.

### 2. Author and check-off metadata are set in hooks, not by rules

`onRecordCreateRequest` and `onRecordUpdateRequest` for `items` overwrite `createdBy` (create only), `updatedBy` with `e.auth.id`. They also set `checkedAt` to now when `checked` changes to true, and clear it when `checked` changes to false. On create they trim `text`, so whitespace-only text fails the required check. On update they keep `createdBy` and, when an already checked item is checked again, the original `checkedAt`. Requests authenticated as a superuser are left untouched, so tests can backdate `checkedAt`.

The alternative was enforcing the values with rules such as `@request.body.createdBy = @request.auth.id`. That would make every client send its own id and fail requests that don't, including partial offline updates. Hooks keep the client simple and make forging impossible instead of rejected.

Hook APIs (`onRecordCreateRequest`, `e.auth`, `e.record.set`, `e.hasSuperuserAuth()`, `cronAdd`, `routerAdd`, `$apis.requireSuperuserAuth()`) must be checked against the 0.40.5 docs during implementation. Each hook handler runs in its own isolated context, so shared code lives in a module loaded with `require()`.

### 3. Cleanup: hourly cron job plus a superuser-only trigger route

`cronAdd` runs every hour. It loads items with `checked = true && checkedAt < now - 24h` and deletes each with `$app.delete(record)`. Deleting records one by one, instead of using a bulk SQL `DELETE`, makes PocketBase emit realtime delete events, so open clients update.

The same function is exposed as `POST /api/einkauf/cleanup`, guarded by `$apis.requireSuperuserAuth()`. The tests backdate `checkedAt` as superuser and call this route, so they don't need to wait for the cron schedule or manipulate the clock.

The 24 hours are a constant in the hook. A configurable environment variable was considered and rejected. Project rules make every new variable required in `compose.yaml`, which would force operators to set a value the family will probably never change. Changing the constant is a one-line change.

### 4. Server hardening in a migration

The same migration that changes the rules enables the built-in rate limiter, with a strict rule for the auth endpoints (`*:auth`) and a generous default rule. It also configures trusted proxy headers. Without them, every request behind Traefik would carry Traefik's IP, and the whole family would share one rate-limit bucket. The client IP is read from the rightmost `X-Forwarded-For` entry, which is the one Traefik appends and which clients cannot spoof.

The exact `settings` field names for rate limits and trusted proxies must be checked against 0.40.5.

### 5. Client: every write goes through the outbox

```
 user action --> outbox.add(op) --> view = merge(snapshot, outbox) --> render
                     |
                     v
                  sync.flush()  (runs right away; does nothing if offline)
                     |  send ops in order
                     |  then reload the full list --> snapshot
                     v
                  PocketBase  ---- realtime events ----> snapshot --> render
```

Operations are `create {id, text}` and `setChecked {id, checked}`. Both are idempotent:

- `create` uses a client-generated id (15 random `a-z0-9` characters from `crypto.getRandomValues`). If the server rejects a retried create because the id exists, `flush` fetches the record. If it exists, the operation counts as done.
- `setChecked` sends an absolute value, never a toggle.

`flush` outcome per operation:

| Result | Action |
|---|---|
| success | remove op, continue |
| network error | stop, keep op, mark offline |
| 401 / 403 | stop, keep op, show login |
| 429 / 5xx | stop, keep op, retry on the next trigger (rate limit or server problem; the op itself is fine) |
| 404 on `setChecked` | drop op (item was deleted), continue |
| 400 on `create`, record exists | drop op as done, continue |
| other 4xx | drop op, log it, show a German notice, continue |

After a successful flush, `sync` reloads the full item list and the user names (id and name only). Both become the cached snapshot. The list is small, so a full reload is simpler and more robust than any change tracking, and it covers events missed while offline. Realtime events that arrive while a reload is running are applied again on top of its result, because the result may be older than they are.

`flush` is triggered by app start, every local operation, the browser `online` event, the page becoming visible, and the realtime `PB_CONNECT` event. `PB_CONNECT` fires on every (re)connect of the SSE stream, which makes it the reliable "I'm back online" signal.

"Online" means the realtime connection is established. `navigator.onLine` is unreliable on phones, so it only serves as an additional trigger. Delete buttons are enabled only while online, and delete is a direct API call, not an outbox operation. A short network loss does not always break the SSE stream, so no new `PB_CONNECT` follows; a successful flush while the realtime client still reports a connection therefore also marks the app as online.

The alternative was writing directly to the API when online and using the outbox only when offline. It was rejected because it creates two code paths, and the offline path would be the one tested least.

### 6. Client modules and storage

```
pb_public/
  index.html               shell + CSP meta tag
  app.css
  manifest.webmanifest, icons/
  sw.js                    Service Worker
  vendor/pocketbase.es.mjs vendored SDK, version noted in a comment
  js/
    app.js                 DOM wiring only
    ids.js                 client id generation
    outbox.js              pure: add, remove, list ops
    view.js                pure: merge(snapshot, outbox) -> sorted rows
    sync.js                flush + reload; takes pb client and storage as params
    storage.js             JSON over localStorage, scoped to the user id
```

`outbox.js`, `view.js`, `ids.js` and `sync.js` take their dependencies as parameters (storage, PocketBase client, clock), so `node --test` can run them with fakes.

Storage uses `localStorage`, not IndexedDB. The data is a few kilobytes, the SDK already keeps its auth token there, and the synchronous API keeps the code short. Only the page reads it; the Service Worker never needs list data. Snapshot and outbox are stored together with the owning user id. If another user logs in on the device, or someone logs out, both are deleted. An expired session doesn't delete them, so the same user can log in again and sync.

Sort order: open items by `created` ascending, then checked items by `checkedAt` descending. Pending items sort by the local time of the action.

### 7. Service Worker: network first, cache fallback

The Service Worker precaches the app shell on install. For same-origin `GET` requests outside `/api/` and `/_/`, it tries the network first with `cache: "no-cache"` and a 3 second timeout. On success it updates the cache; on failure or timeout it serves the cached copy. It never caches `/api/` responses.

Network-first means a user who is online always gets the latest deployed frontend, without bumping a cache version by hand on every deploy. This matters because there is no build step that could do it. The cost is up to 3 seconds of waiting when opening the app with a very weak signal. Cache-first with stale-while-revalidate was rejected because it shows the old version for one more start, and an old client paired with a new schema is the classic Service Worker failure.

### 8. Content Security Policy as a meta tag

`index.html` declares `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'`. There are no inline scripts or styles. Item text is rendered only through `textContent`, never `innerHTML`.

A meta tag keeps the policy next to the page it protects and needs no hook. Setting it as an HTTP header from a hook would also hit the admin UI, which brings its own scripts. The limitation: `frame-ancestors` cannot be set through a meta tag (see Risks).

### 9. UI

- Mobile first, one centered column on desktop (max ~40rem), system font stack, light and dark through `prefers-color-scheme`.
- A sticky input at the top: type, then Enter or "Hinzufügen". It stays reachable on desktop and avoids a bottom-fixed input being covered by the phone keyboard.
- One row per item: a large checkbox area (the whole row toggles), the text, a small meta line "von Anna" or "von Anna · zuletzt Ben", and a delete button. Pending items get a small "nicht synchronisiert" marker.
- A status bar for offline and session states ("Offline – Änderungen werden später übertragen").
- The delete confirmation uses the native `<dialog>` element, not `window.confirm`.

### 10. Tests

```
make test
  nix develop -c node --test "tests/unit/**/*.test.mjs" "tests/api/**/*.test.mjs"
  nix develop -c playwright test           (config: playwright.config.mjs)

tests/
  support/server.mjs   start PocketBase on a temp dir + free port, run migrations,
                       create superuser (CLI) and test users (API); stop + delete
  unit/                ids, outbox, view, sync with fake pb client + storage
  api/                 rules, hooks, cleanup, rate limit; one server per file
  e2e/                 two browser contexts (Anna, Ben); one server per run
```

- API tests use plain `fetch` and read SSE as a stream for the realtime scenarios, so they test the raw HTTP contract without depending on the SDK.
- To keep login traffic below the rate limit, tests other than the login and rate-limit tests get user tokens through the superuser impersonate endpoint.
- Offline in e2e uses `context.setOffline(true)`. The Playwright spike checks whether this also cuts off Service Worker requests. If it doesn't, the tests block requests with `context.route()` or stop the test server instead.
- `flake.nix` adds `nodejs` and `playwright-test` and sets `PLAYWRIGHT_BROWSERS_PATH` to nixpkgs' `playwright-driver.browsers`. Runner and browsers then come from the same locked nixpkgs and have the same version.

### 11. Migrations are written by hand

The migrations are written as JS files instead of being clicked together in the admin UI, so that the rules and settings are reviewable in one place. The README's admin-UI workflow remains valid for later changes.

## Risks / Trade-offs

- [Playwright from nixpkgs fails on macOS, or `@playwright/test` cannot be resolved without `node_modules`] → The first task is a spike that runs one trivial e2e test. If it fails, stop and ask the user before considering npm.
- [`setOffline` does not affect Service Worker fetches] → Fall back to `context.route()` aborts or stopping the server. Both simulate "server unreachable", which is the condition that matters.
- [Node loads `pb_public/js/*.js` as CommonJS without a `package.json`] → Node 24 detects ES module syntax automatically; the spike confirms it. Fallback: a minimal `tests/package.json` is not enough because the modules live in `pb_public/`. Instead, add a root `package.json` containing only `{"type": "module"}`, with no dependencies.
- [PocketBase serves `.mjs` with a wrong MIME type, so the browser refuses the module] → Check in the spike; otherwise rename the vendored file to `.js`.
- [Traefik in front of the app does not set `X-Forwarded-For` as expected] → Wrong headers cause shared or spoofable rate-limit buckets. Verify after the first deployment with two devices; adjust the trusted proxy setting in a new migration.
- [Clickjacking: `frame-ancestors` is not available through a meta tag] → Low impact for a private list. Can be added later as a header in the Traefik configuration.
- [iOS evicts site data after about 7 days without use if the app is not installed] → Recommend installing to the home screen in the README; an evicted cache only means logging in again.
- [Auth token expires while offline] → Pending changes are kept per user (Decision 6). The token is refreshed on every online start, so an active user stays logged in.
- [Two tabs on the same device flush the same outbox] → Operations are idempotent, so this causes extra requests but no wrong data.
- [Last-write-wins on `checked` can override another user's concurrent action] → Accepted. Both users see the result live and can correct it with one tap.

## Spike Results

- nixpkgs provides Node 24.21.0 and Playwright 1.64.1. The runner expects Chromium revision 1248, which is the revision in `playwright-driver.browsers`, so runner and browsers match.
- Playwright from nixpkgs runs on macOS without `node_modules`. Its wrapper puts `@playwright/test` on `NODE_PATH`, which only CommonJS `require` honors; a plain ES `import '@playwright/test'` fails with `ERR_MODULE_NOT_FOUND`. Test files and the config therefore stay ES modules and load Playwright through `createRequire(import.meta.url)`, wrapped in one small support module.
- Node loads `pb_public/js/*.js` as ES modules without a `package.json` and without a warning. The fallback root `package.json` is not needed.
- PocketBase 0.40.5 serves both `.js` and `.mjs` as `text/javascript; charset=utf-8` with `X-Content-Type-Options: nosniff`. The vendored SDK can keep its `.mjs` name.
- Playwright's `context.setOffline(true)` also cuts requests made by the Service Worker, so the e2e tests use it directly; the `context.route()` fallback is not needed. It does not always close an open SSE stream, which is why a successful flush can also mark the app online (Decision 5).
- PocketBase serves static files with a `Last-Modified` header in whole seconds and no `ETag`. A file changed within the same second as the previous request is answered with 304. Deployments are not affected, because `git pull` sets the modification time to the time of the pull.
- Chromium's headless shell never reports installability errors. The manifest test uses the full Chromium build (`channel: 'chromium'`) and ignores only the `in-incognito` error that every Playwright context has.
- The SDK's realtime client retries without limit only after a connection succeeded once. When the very first attempt fails, as on an app start without a connection, it rejects the subscription and stops. The app remembers that case and subscribes again after the next flush that reaches the server.

## Migration Plan

1. Pull and restart as described in the README. The migrations run on startup. The image's automatic superuser setup is no longer used: it runs without the encryption key and fails once the rate-limit migration has saved the settings encrypted, which stopped the container in a restart loop on the first deployment of this change.
2. Create one account per family member in the admin UI (`/_/`), including the display name.
3. Rollback: deploy the previous commit. The new migrations have down functions that remove the `items` collection and restore the default `users` rules. Rolling back deletes all list items, which is acceptable at this stage.

## Open Questions

- Resolved: the SDK is v0.28.1 (released 2026-09-05), the newest release. Its 0.28.0 changelog adds support for endpoints of PocketBase v0.40.0, so it targets the pinned server line; no newer SDK exists. It loads in Chromium from `make dev`, and its realtime client reconnects without a retry limit.
