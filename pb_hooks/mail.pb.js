/// <reference path="../pb_data/types.d.ts" />

// The app sends no emails. No mail server is configured, and without one
// PocketBase hands mails to the host's sendmail, which delivers them straight
// from the server's address, where they bounce or land in a local mailbox.
// Password reset and verification requests can be sent by anyone who knows
// an address, and every logged-in user can request an email change, so every
// mail is refused here. PocketBase sends reset and verification mails in the
// background and only logs the error, so those requests still succeed and
// reveal nothing about the address. An email change request fails instead,
// which is right: the change could only be confirmed by email.
onMailerSend((e) => {
  throw new Error(`The app sends no emails; refused "${e.message?.subject}" to ${e.message?.to?.length} recipient(s)`);
});
