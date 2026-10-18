# Proposal

## Why

After shopping, the list ends up with many checked-off items. Removing them
means deleting each one separately; otherwise they stay greyed out until the
cleanup deletes them after 24 hours. Clearing all checked-off items at once is
the most common bulk action the family needs, so one action covers it without
a general multi-select mode.

## What Changes

- The list gets one action that deletes all checked-off items at once
  ("Erledigte löschen").
- The action covers only the checked-off items shown on the device when the
  user triggers it. Items checked off on the device but not yet synchronized
  are excluded, as they are for deleting a single item.
- Like deleting a single item, clearing is only offered while online.
- An item another family member un-checks at the same moment must not be
  deleted by mistake.
- Out of scope: a general multi-select mode, checking off or un-checking
  several items at once, deleting several open items at once, and bringing
  back items bought earlier. Bringing items back would first need a longer
  retention than the 24-hour cleanup and is a separate change.

## Open Questions

These decisions are still open and must be settled before the specs and the
design are written.

1. **Placement (decided).** The action goes into the header of the
   collapsible "Erledigt (n)" section that the change
   `improve-design-and-usability` introduces ("Erledigt (3) · Alle löschen").
   It sits where the checked-off items are and disappears when nothing is
   checked off. This change therefore builds on that one and is implemented
   after it.
2. **Confirmation.** A single checked-off item is deleted without asking.
   Clearing can remove many items for good, so leaning towards a short
   confirmation that states the count ("3 erledigte Einträge löschen?").
3. **Client loop or server route.** Deleting the items one by one from the
   client needs no server code, but it would also delete an item that someone
   else un-checked a moment earlier. A server route that receives the item ids
   and deletes only those that are still checked off avoids that, at the cost
   of a new route and API tests. Leaning towards the server route.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `shopping-list`: adds clearing all checked-off items at once, online only,
  without deleting items that were un-checked meanwhile.

## Impact

Depends on the open questions; expected:

- `pb_public/index.html`, `app.js`, `app.css`: the action, possibly a
  separator between open and checked-off items, possibly a confirmation
  dialog.
- `pb_public/js/view.js`: which items are cleared and whether the action is
  shown, with unit tests.
- If the server route is chosen: a new route in `pb_hooks/`, restricted to
  family members, with API tests. Deleting through the app keeps realtime
  events, so other devices update live.
- Tests: e2e for clearing, for the online-only rule and for excluded
  unsynchronized items.
- No new dependencies, no new files in `pb_public/`, no schema change.
