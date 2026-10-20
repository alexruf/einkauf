# Ideas

This is a collection of things that could make the app better, with the
reasoning behind each one. It is not a roadmap: nothing here is promised or
scheduled. When an idea is picked up, it goes through OpenSpec like any other
change, and it is removed from this page once that change is archived.

## Operations

### Backups

Nothing backs up `pb_data/` today, and neither the README nor `compose.yaml`
describes how to. That directory holds every account, item and purchase, so
losing it means starting from scratch. PocketBase can create scheduled
backups by itself (admin UI, Settings, Backups), locally or to S3-compatible
storage. Switching that on and documenting how to restore a backup in the
README is the most important open point, more important than any feature.

### Uptime monitoring

The container has a health check, but nobody is told when it fails. An
external check against `/api/health`, for example with Uptime Kuma, would
report a hanging or unreachable server before the family notices it in the
shop.

## Accounts

### Change your own password

The app sends no email, so a forgotten password can only be reset by the
administrator, and today the same is true for changing one. The server
already allows it: the users `updateRule` lets everyone update their own
record, and PocketBase changes a password when the old one is sent along.
What is missing is a small form in the account menu.

### Change your own display name

The same rule already allows family members to change their own name. The
app only needs a way to do it in the account menu.

## Using the list

### Undo

After checking off or deleting an item, the app could offer "Rückgängig" for
a few seconds. This matters most for deleting, which is permanent. Checking
off is already forgiving, because the row stays in place for a moment and
can simply be un-checked.

## New features

These are sorted by how much we expect them to help.

### Several lists or shops

Supermarket, drugstore and hardware store have different lists in practice.
This could be a tag on each item or separate lists. Claims would fit better
too: "I am going to the drugstore" is what people actually say.

### Categories or aisle order

Simple categories such as fruit and vegetables or the fridge section, with
the open list grouped by them, would match the walk through a shop. The
category could be remembered per text in the purchases collection, so after
the first time an item is sorted automatically.
