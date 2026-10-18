/// <reference path="../pb_data/types.d.ts" />

// A family member can claim an open item to tell the others they will get it.
// Both fields are set and cleared only by the items hook and the cleanup, so
// the update rule stays as it is.
migrate((app) => {
  const items = app.findCollectionByNameOrId("items");
  const users = app.findCollectionByNameOrId("users");
  items.fields.add(
    // Without cascade, like createdBy: deleting an account only clears the
    // claim and keeps the item.
    new RelationField({ name: "claimedBy", collectionId: users.id, maxSelect: 1, cascadeDelete: false }),
    // Drives the expiry of old claims.
    new DateField({ name: "claimedAt" }),
  );
  app.save(items);
}, (app) => {
  const items = app.findCollectionByNameOrId("items");
  items.fields.removeByName("claimedBy");
  items.fields.removeByName("claimedAt");
  app.save(items);
});
