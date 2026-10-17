// Shared item logic. PocketBase runs every hook handler in its own isolated
// context, so handlers load this module with require() instead of sharing
// top-level functions.

// Sets the fields that clients must not control: who created and last changed
// the item, when it was checked off, and the trimmed text. Values sent by the
// client for these fields are overwritten, so forging them has no effect.
function applyMemberWrite(record, auth, isCreate) {
  const original = isCreate ? null : record.original();

  if (isCreate) {
    record.set("text", record.getString("text").trim());
    record.set("createdBy", auth.id);
  } else {
    record.set("createdBy", original.getString("createdBy"));
  }
  record.set("updatedBy", auth.id);

  const checked = record.getBool("checked");
  const wasChecked = original ? original.getBool("checked") : false;
  if (!checked) {
    record.set("checkedAt", "");
  } else if (!wasChecked) {
    record.set("checkedAt", new DateTime());
  } else {
    // Checking off an already checked item keeps the original time, so a
    // repeated offline sync does not postpone the cleanup.
    record.set("checkedAt", original.get("checkedAt"));
  }
}

// Checked-off items older than this are deleted, so the list does not fill up
// with grey entries.
const CHECKED_RETENTION_MS = 24 * 60 * 60 * 1000;

// Deletes old checked-off items one by one instead of with a single SQL
// DELETE, because only record deletes through the app send realtime events to
// open clients. Returns the number of deleted items.
function deleteOldCheckedItems(app) {
  // Same text format as stored dates ("2006-01-02 15:04:05.000Z"), so the
  // comparison in the filter is a plain string comparison.
  const cutoff = new Date(Date.now() - CHECKED_RETENTION_MS).toISOString().replace("T", " ");
  const records = app.findRecordsByFilter(
    "items",
    "checked = true && checkedAt != '' && checkedAt < {:cutoff}",
    "",
    0,
    0,
    { cutoff },
  );
  for (const record of records) {
    app.delete(record);
  }
  return records.length;
}

module.exports = { applyMemberWrite, deleteOldCheckedItems };
