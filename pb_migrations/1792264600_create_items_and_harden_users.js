/// <reference path="../pb_data/types.d.ts" />

// Only regular family accounts may use the list. Checking the collection name,
// not just a non-empty auth id, also rejects tokens of other auth collections.
const FAMILY_MEMBER = '@request.auth.collectionName = "users"';

migrate((app) => {
  // Accounts are created and deleted only by the administrator. Every family
  // member may read the others' ids and names; emails stay hidden because
  // emailVisibility is off by default.
  const users = app.findCollectionByNameOrId("users");
  users.createRule = null;
  users.deleteRule = null;
  users.listRule = FAMILY_MEMBER;
  users.viewRule = FAMILY_MEMBER;
  users.updateRule = "id = @request.auth.id";

  // The display name is what the app shows instead of the email, so it must
  // always exist. The pattern rejects leading and trailing whitespace, which
  // also rules out names made only of spaces.
  const name = users.fields.getByName("name");
  name.required = true;
  name.max = 30;
  name.pattern = "^\\S(.*\\S)?$";
  app.save(users);

  const items = new Collection({
    type: "base",
    name: "items",
    listRule: FAMILY_MEMBER,
    viewRule: FAMILY_MEMBER,
    createRule: FAMILY_MEMBER,
    // Only the checked state may change; the text is fixed after creation.
    updateRule: `${FAMILY_MEMBER} && @request.body.text:isset = false`,
    deleteRule: FAMILY_MEMBER,
    fields: [
      { type: "text", name: "text", required: true, max: 200 },
      { type: "bool", name: "checked" },
      // Set and cleared by a hook; drives the cleanup of old checked items.
      { type: "date", name: "checkedAt" },
      // Optional and without cascade, so deleting an account keeps its items
      // and only clears the reference.
      { type: "relation", name: "createdBy", collectionId: users.id, maxSelect: 1, cascadeDelete: false },
      { type: "relation", name: "updatedBy", collectionId: users.id, maxSelect: 1, cascadeDelete: false },
      { type: "autodate", name: "created", onCreate: true, onUpdate: false },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
  });
  app.save(items);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("items"));

  // Restore the defaults PocketBase 0.40.5 creates for the users collection.
  const users = app.findCollectionByNameOrId("users");
  users.createRule = "";
  users.deleteRule = "id = @request.auth.id";
  users.listRule = "id = @request.auth.id";
  users.viewRule = "id = @request.auth.id";
  users.updateRule = "id = @request.auth.id";

  const name = users.fields.getByName("name");
  name.required = false;
  name.max = 255;
  name.pattern = "";
  app.save(users);
});
