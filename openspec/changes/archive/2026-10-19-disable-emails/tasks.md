# Tasks

## 1. Tests

- [x] 1.1 Point the test server in `tests/api/user-auth.test.mjs` at a fake SMTP server and write failing tests for a new-device login of a user and of a superuser, password reset and verification requests for an unverified account, and an email change request; let `createUser` create unverified accounts

## 2. Refuse all mail

- [x] 2.1 Add `pb_hooks/mail.pb.js` with an `onMailerSend` hook that throws, and verify all tests from 1.1 pass
- [x] 2.2 Add `pb_migrations/1792265100_disable_auth_alerts.js` that turns off `authAlert` for `users` and `_superusers`, and verify the login tests pass without the hook

## 3. Documentation and full run

- [x] 3.1 List `pb_hooks/mail.pb.js` under server logic in `AGENTS.md` and check that the README still describes the behavior
- [x] 3.2 Run `make fmt` and then `make test` and verify everything passes
