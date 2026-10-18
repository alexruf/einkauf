/// <reference path="../pb_data/types.d.ts" />

// The app shows the application name from the settings, also on the login
// screen. Only superusers may read the settings, so this route hands out the
// name and nothing else, without requiring a login.
routerAdd("GET", "/api/einkauf/app-name", (e) => {
  return e.json(200, { name: e.app.settings().meta.appName });
});
