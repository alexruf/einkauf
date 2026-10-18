/// <reference path="../pb_data/types.d.ts" />

// Family members may now change an item's text as well as its checked state.
// The items hook still sets the author fields and checkedAt itself, so those
// stay out of the client's control without a rule.
const FAMILY_MEMBER = '@request.auth.collectionName = "users"';

migrate((app) => {
  const items = app.findCollectionByNameOrId("items");
  items.updateRule = FAMILY_MEMBER;
  app.save(items);
}, (app) => {
  const items = app.findCollectionByNameOrId("items");
  items.updateRule = `${FAMILY_MEMBER} && @request.body.text:isset = false`;
  app.save(items);
});
