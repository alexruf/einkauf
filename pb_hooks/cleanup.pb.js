/// <reference path="../pb_data/types.d.ts" />

cronAdd("einkauf_cleanup", "0 * * * *", () => {
  const items = require(`${__hooks}/items.js`);
  const deleted = items.deleteOldCheckedItems($app);
  if (deleted > 0) {
    $app.logger().info("Deleted old checked-off items", "count", deleted);
  }
  const released = items.releaseExpiredClaims($app);
  if (released > 0) {
    $app.logger().info("Released expired claims", "count", released);
  }
  const expired = require(`${__hooks}/purchases.js`).expirePurchases($app);
  if (expired > 0) {
    $app.logger().info("Deleted old purchases", "count", expired);
  }
});

// Runs the same cleanup on demand. The tests use it so they don't have to wait
// for the hourly schedule.
routerAdd(
  "POST",
  "/api/einkauf/cleanup",
  (e) => {
    const items = require(`${__hooks}/items.js`);
    const deleted = items.deleteOldCheckedItems(e.app);
    const released = items.releaseExpiredClaims(e.app);
    const expired = require(`${__hooks}/purchases.js`).expirePurchases(e.app);
    return e.json(200, { deleted, released, expired });
  },
  $apis.requireSuperuserAuth(),
);
