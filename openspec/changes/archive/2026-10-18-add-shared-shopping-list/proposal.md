# Proposal

## Why

The repository runs PocketBase locally and in production, but the app itself does not exist yet: there is no schema, no login and only a placeholder page. The family needs a first usable version. It must be a complete slice through every layer: log in, see the shared list, add items, check them off. Changes must appear live on every phone, and the list must keep working inside shops, where mobile reception is often missing.

## What Changes

- Personal user accounts with email and password. The app is unusable without logging in. Accounts are created by the administrator; there is no self-registration.
- One shared shopping list visible to every family member. Items can be added, checked off (greyed out, not removed) and un-checked again.
- Each item shows who added it and who changed it last. The server records this; clients cannot forge it.
- Items can be deleted while online. Deleting an unchecked item asks for confirmation first. Deletes are permanent (hard delete).
- A server job deletes items that were checked off more than 24 hours ago, so the list does not fill up with grey entries.
- Changes from other family members appear live without reloading.
- Offline use (level 2): the app opens without a connection, shows the last known list, and lets the user add, check off and un-check items. Pending changes are sent automatically once the connection returns. Deleting stays online-only.
- Installable web app (PWA) with a simple, modern, German UI that works well on phones and desktop browsers.
- Security hardening: strict API rules, the built-in rate limiter enabled, and a strict Content Security Policy. Logging out removes all list data from the device.
- An automated test suite runnable with one command: `node --test` for API rules and client logic, and Playwright for browser scenarios such as live updates and offline sync. Both come from the Nix dev shell, without npm.
- The PocketBase JS SDK is vendored into `pb_public/` as a single file.

Out of scope: editing an item's text, private lists, claiming items ("besorge ich"), restricting access to the admin UI.

## Capabilities

### New Capabilities

- `user-auth`: user accounts, login and logout, and the rule that every app feature requires an authenticated user.
- `shopping-list`: the shared list and its items: adding, checking off and un-checking, deleting, author metadata, live updates and automatic cleanup of checked-off items.
- `offline-sync`: using the list without a connection and synchronizing pending changes afterwards.
- `web-app`: how the frontend is delivered: installable PWA, responsive layout for phone and desktop, German UI, Content Security Policy.

### Modified Capabilities

- `development-environment`: adds a requirement for a single command that runs the automated test suite, and the dev shell provides the test tooling.

## Impact

- `pb_migrations/`: first migrations. They harden the built-in `users` collection, create the `items` collection and enable rate limiting.
- `pb_hooks/`: new hooks for author and check-off metadata, plus the cleanup job.
- `pb_public/`: replaces the placeholder with the app: HTML, CSS, ES modules, Service Worker, manifest, icons and the vendored PocketBase JS SDK.
- `flake.nix`: the dev shell gains `nodejs` and `playwright-test` from nixpkgs.
- New `tests/` directory, plus a `make test` target in the `Makefile`.
- `README.md` and `AGENTS.md`: document accounts, tests and the test command. Remove the "no test harness" note.
- Production: no new environment variables. After deploying, the administrator creates user accounts in the admin UI.
