/// <reference path="../pb_data/types.d.ts" />

// Requests made as superuser are left untouched, so the administrator and the
// tests can set any value, for example a checkedAt date in the past.

onRecordCreateRequest((e) => {
  if (!e.hasSuperuserAuth()) {
    require(`${__hooks}/items.js`).applyMemberWrite(e.record, e.auth, true);
  }
  e.next();
}, "items");

onRecordUpdateRequest((e) => {
  if (e.hasSuperuserAuth()) {
    e.next();
    return;
  }
  require(`${__hooks}/items.js`).applyMemberWrite(e.record, e.auth, false);
  const wasChecked = e.record.original().getBool("checked");
  const checked = e.record.getBool("checked");
  const text = e.record.getString("text");
  // Counted only after the save succeeded, so a refused update counts nothing.
  e.next();
  require(`${__hooks}/purchases.js`).recordCheckChange(e.app, wasChecked, checked, text);
}, "items");
