# Design

## Refuse mail in `onMailerSend`

`onMailerSend` runs for every mail PocketBase sends, whatever triggered it,
so one hook covers password reset, verification, email change, OTP, login
alerts and anything a later PocketBase version adds. The handler throws
instead of calling `e.next()`, so the log shows every refused attempt instead
of dropping it silently.

PocketBase sends password reset and verification mails in the background
and only logs the error, so those responses stay unchanged (still `204`).
That keeps the endpoints from revealing whether an address exists. The email
change mail is sent during the request, so that request now fails with
`400`. This is the honest answer: the change can only be confirmed by email,
and the request reveals nothing, because a logged-in user asks about their
own account. Faking a success for a change that never happens would be worse.

Alternatives considered:

- Returning an error from the request hooks (`onRecordRequestPasswordResetRequest`
  and friends): one hook per endpoint, easy to miss one, and an error
  response would differ between existing and unknown addresses.
- Only disabling the auth alert: leaves password reset and verification
  open to anyone who knows an address.

## Disable the auth alert in a migration

With only the hook, every login from a new device would log a refused mail
as an error. Turning `authAlert.enabled` off for `users` and `_superusers`
stops PocketBase from trying, and the admin UI then shows the setting as it
really is. The down migration restores PocketBase's default.

## Test with a fake SMTP server

The test PocketBase is pointed at a local TCP server that counts connections
and drops them. Some mails are sent after the response, so each test waits
briefly before asserting that no connection arrived. Both layers were
checked separately: without the hook, reset, verification and email change
tests fail; without the migration the hook still covers login alerts.
