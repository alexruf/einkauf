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
  if (!e.hasSuperuserAuth()) {
    require(`${__hooks}/items.js`).applyMemberWrite(e.record, e.auth, false);
  }
  e.next();
}, "items");
