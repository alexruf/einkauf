/// <reference path="../pb_data/types.d.ts" />

// A quantity or hint for an item, kept apart from its text, so the text stays
// clean for purchases, suggestions and duplicate detection. The items hook
// trims it like the text; family members may change it without a rule.
migrate((app) => {
  const items = app.findCollectionByNameOrId("items");
  // Optional, so existing items read as having an empty note.
  items.fields.add(new TextField({ name: "note", max: 200 }));
  app.save(items);
}, (app) => {
  const items = app.findCollectionByNameOrId("items");
  items.fields.removeByName("note");
  app.save(items);
});
