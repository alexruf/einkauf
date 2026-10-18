/// <reference path="../pb_data/types.d.ts" />

// The app shows the application name from the settings. New installations
// should start with the app's own name instead of PocketBase's default. A name
// an admin has already chosen is left alone.
migrate((app) => {
  const settings = app.settings();
  if (settings.meta.appName !== "Acme") return;
  settings.meta.appName = "Einkauf";
  app.save(settings);
}, (app) => {
  // Restore the default of PocketBase 0.40.5, unless the name was changed.
  const settings = app.settings();
  if (settings.meta.appName !== "Einkauf") return;
  settings.meta.appName = "Acme";
  app.save(settings);
});
