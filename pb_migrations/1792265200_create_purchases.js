/// <reference path="../pb_data/types.d.ts" />

const FAMILY_MEMBER = '@request.auth.collectionName = "users"';

// What the family bought, so the app can suggest it while someone adds an
// item. Only the items hook and the cleanup write purchases; family members
// can read them, and the administrator can fix them in the admin UI.
migrate((app) => {
  const purchases = new Collection({
    type: "base",
    name: "purchases",
    listRule: FAMILY_MEMBER,
    viewRule: FAMILY_MEMBER,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      // The text in lower case with whitespace collapsed, so "Milch" and
      // "milch" count as the same purchase.
      { type: "text", name: "key", required: true, max: 200 },
      // The spelling of the last check-off, which the app shows.
      { type: "text", name: "text", required: true, max: 200 },
      { type: "number", name: "count", onlyInt: true, min: 0 },
      // Drives the expiry of purchases nobody bought for a long time.
      { type: "date", name: "lastAt" },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_purchases_key ON purchases (key)"],
  });
  app.save(purchases);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("purchases"));
});
