/// <reference path="../pb_data/types.d.ts" />

cronAdd("einkauf_cleanup", "0 * * * *", () => {
  const deleted = require(`${__hooks}/items.js`).deleteOldCheckedItems($app);
  if (deleted > 0) {
    $app.logger().info("Deleted old checked-off items", "count", deleted);
  }
});

// Runs the same cleanup on demand. The tests use it so they don't have to wait
// for the hourly schedule.
routerAdd("POST", "/api/einkauf/cleanup", (e) => {
  const deleted = require(`${__hooks}/items.js`).deleteOldCheckedItems(e.app);
  return e.json(200, { deleted });
}, $apis.requireSuperuserAuth());
