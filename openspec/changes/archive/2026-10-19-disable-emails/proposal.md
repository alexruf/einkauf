# Proposal

## Why

After a family member logged in on a new iPhone, PocketBase tried to email a
"Login from a new location" alert. No mail server is configured, so
PocketBase fell back to the host's `sendmail`, which tried to deliver the
mail straight from a residential address. The recipient rejected it and the
bounce landed in the local mailbox. The app is meant to send no emails at
all; the README already says so, but PocketBase's defaults were never turned
off.

The same fallback is reachable by anyone: password reset and verification
requests need no login, only a known address, and every logged-in user can
request an email change.

## What Changes

- A hook refuses every mail PocketBase tries to send, and PocketBase logs each
  refused mail as an error. Password reset and verification requests still
  answer as before, so they reveal nothing about whether an address exists.
  An email change request now fails, because the change could only be
  confirmed by email.
- A migration turns off the new-device login alert for family accounts and
  superusers, so normal logins do not produce those errors.
- Out of scope: configuring a real mail server, and closing the request
  endpoints themselves.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `user-auth`: adds that the app sends no emails, with scenarios for a login
  from a new device and for the requests that would otherwise send one.

## Impact

- New hook `pb_hooks/mail.pb.js`, listed under server logic in `AGENTS.md`.
- New migration `pb_migrations/1792265100_disable_auth_alerts.js`.
- `tests/api/user-auth.test.mjs`: a fake SMTP server proves that no mail is
  attempted; `createUser` in `tests/support/server.mjs` can create
  unverified accounts.
- No frontend change, no new dependencies.
