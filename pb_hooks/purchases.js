// Counts what the family buys, so the app can suggest it while someone adds
// an item. Loaded with require() inside each handler, like items.js.

// Texts that differ only in case or spacing are the same purchase. The app
// normalizes the same way in pb_public/js/suggest.js.
function purchaseKey(text) {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function findPurchase(app, key) {
  const records = app.findRecordsByFilter("purchases", "key = {:key}", "", 1, 0, { key });
  return records.length > 0 ? records[0] : null;
}

// Checking an item off counts one purchase of its text; un-checking takes
// it back. Checking off an already checked item, which a repeated offline
// sync does, changes nothing. A failure is logged instead of thrown, because
// the item change has already been saved and matters more than the count.
function recordCheckChange(app, wasChecked, checked, text) {
  if (wasChecked === checked) return;
  const key = purchaseKey(text);
  try {
    if (checked) {
      recordPurchase(app, key, text);
    } else {
      takeBackPurchase(app, key);
    }
  } catch (error) {
    app.logger().error("Recording a purchase failed", "key", key, "checked", checked, "error", String(error));
  }
}

function recordPurchase(app, key, text) {
  let purchase = findPurchase(app, key);
  if (!purchase) {
    purchase = new Record(app.findCollectionByNameOrId("purchases"));
    purchase.set("key", key);
    purchase.set("count", 0);
  }
  purchase.set("text", text.trim());
  purchase.set("count", purchase.getInt("count") + 1);
  purchase.set("lastAt", new DateTime());
  app.save(purchase);
}

// Without a purchase for the text, for example because the item was edited
// after it was checked off, there is nothing to take back.
function takeBackPurchase(app, key) {
  const purchase = findPurchase(app, key);
  if (!purchase) return;
  const count = purchase.getInt("count") - 1;
  if (count <= 0) {
    app.delete(purchase);
  } else {
    purchase.set("count", count);
    app.save(purchase);
  }
}

// Purchases nobody bought for this long are deleted, so typos and things the
// family stopped buying drop out of the suggestions.
const PURCHASE_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

// Deletes purchases not bought within the retention period. Returns the
// number of deleted purchases.
function expirePurchases(app) {
  // Same text format as stored dates, so the filter compares plain strings.
  const cutoff = new Date(Date.now() - PURCHASE_RETENTION_MS).toISOString().replace("T", " ");
  const records = app.findRecordsByFilter("purchases", "lastAt < {:cutoff}", "", 0, 0, { cutoff });
  for (const record of records) {
    app.delete(record);
  }
  return records.length;
}

module.exports = { purchaseKey, recordCheckChange, expirePurchases };
