/// <reference path="../pb_data/types.d.ts" />

// PocketBase warns users by email when they log in from a new device. The app
// sends no emails (pb_hooks/mail.pb.js refuses every mail), so the alert could
// only fail and fill the log with an error on every new login.
migrate((app) => {
  for (const name of ["users", "_superusers"]) {
    const collection = app.findCollectionByNameOrId(name);
    collection.authAlert.enabled = false;
    app.save(collection);
  }
}, (app) => {
  // Restore the default of PocketBase 0.40.5.
  for (const name of ["users", "_superusers"]) {
    const collection = app.findCollectionByNameOrId(name);
    collection.authAlert.enabled = true;
    app.save(collection);
  }
});
