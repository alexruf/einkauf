# Design

## Context

See proposal.md for the motivation and the delta specs for the requirements.

The current state that shapes the approach:

- The items `updateRule` allows any update by a family member. The hook
  `applyMemberWrite` in `pb_hooks/items.js` then overwrites every field the
  client must not control: it keeps `createdBy`, sets `updatedBy` to the
  requester and derives `checkedAt` from the checked state. That hook runs
  only for API requests; `app.save()` from a cron job bypasses it.
- The hourly cron `einkauf_cleanup` and the superuser route
  `/api/einkauf/cleanup` both call `deleteOldCheckedItems`. It deletes record
  by record through the app, so realtime events reach open clients.
- Every write goes through the outbox as an absolute operation (`create`,
  `setChecked`, `setText`). `sync.js` sends them in order and fetches only the
  fields in `ITEM_FIELDS`. `view.buildRows` lays pending operations over the
  last snapshot and builds the `meta` text of each row.
- `render()` in `app.js` rebuilds all rows from the item template. The row is
  `[label.toggle] [button.edit] [button.delete]`; the layout e2e test checks
  44 px tap targets and no horizontal scrolling at 360 px.
- `--warn` (orange/yellow) already colors the "pending" and "busy" dots in the
  status bar, and `--notice` (pale yellow) the offline banner. The CSP forbids
  inline styles, so state must reach CSS through classes or data attributes.

## Goals / Non-Goals

**Goals:**
- Claiming uses the same outbox, sync and hook paths as checking off, so it
  works offline and cannot be forged without new mechanisms.
- One migration that only adds fields; no rule change.

**Non-Goals:**
- Showing the remaining time of a claim, or expiring claims on the client.
- Telling a user that their claim was removed by someone else.

## Decisions

### Two new fields, set only by the hook

A new migration adds `claimedBy` (relation to users, `maxSelect: 1`, no
cascade, like `createdBy`) and `claimedAt` (date) to `items`. Deleting an
account clears the relation, so the item becomes unclaimed. That matches the
spec without extra code.

`applyMemberWrite` decides the claim like this:

```
create                          -> claimedBy = '', claimedAt = ''
checked after this write        -> claimedBy = '', claimedAt = ''
claimedBy unchanged vs original -> keep both (covers updates without claim
                                   and a repeated claim by the same user)
claimedBy set to anything       -> claimedBy = auth.id, claimedAt = now
claimedBy set to ''             -> claimedBy = '', claimedAt = ''
```

The client sends its own id to claim and `''` to release. The hook never
trusts the id it receives, it only reads "set or cleared". A forged id becomes
the requester's id. Comparing with the original makes a repeated claim keep
its first `claimedAt`, the same way `checkedAt` is kept for a repeated
check-off. A claim on a checked item is dropped because the "checked" rule
comes first, so the server alone enforces "only open items".

One edge case: A claims, B's claim of the same item arrives while A's is
stored. The hook sees a change (A to B) and stores B. That is the intended
last-write-wins.

Alternatives considered:
- A boolean `claimed` field plus `claimedBy` set by the hook. Rejected because
  it stores the same fact twice and the two can disagree.
- Sending a non-schema body field such as `claim: true`. Rejected because it
  needs reading the raw request body in the hook, and PocketBase ignores
  unknown fields elsewhere, which makes the contract less visible.
- A conditional release that only clears the claim of a named user.
  Rejected in discovery: a stale release removing a newer claim is rare and
  cheap to fix with one more tap.

### Claiming counts as a change of the item

The hook sets `updatedBy` on every member write, so claiming and releasing
make the user the last editor without extra code. While an item is claimed,
the claim line replaces the creator and editor line, so this only becomes
visible after release or check-off.

### Expiry runs in the existing cleanup

`items.js` gets `releaseExpiredClaims(app)`. It finds items with
`claimedAt != '' && claimedAt < cutoff` (cutoff 3 hours ago, same string
format as `deleteOldCheckedItems`), clears both fields and saves each record
with `app.save()`. Saving through the app sends realtime events, and it skips
the request hook, so `updatedBy` stays as it was. Both the cron and the route
call it after the delete; the route returns `{ deleted, released }`.

With an hourly cron, a claim lives between 3 and 4 hours. That is acceptable
for the purpose. A more frequent cron was considered and rejected: it would
run the checked-items cleanup more often for no gain, and a second cron adds
another moving part.

### A new absolute outbox operation `setClaimed`

`{ type: 'setClaimed', id, claimed }`. `sync.send` maps it to
`items.update(id, { claimedBy: claimed ? me : '' })`, where `me` is the id of
the logged-in user from `pb.authStore`. A 404 is treated like for
`setChecked`: the item was deleted, the change is dropped. `ITEM_FIELDS` gains
`claimedBy` and `claimedAt` so reloads and realtime events carry them.

In `buildRows`, a pending `setClaimed` applies only to an open item: it sets
`claimedBy` to `me` or `''`, sets `updatedBy` to `me` and marks the row
pending. A pending `setChecked(true)` clears the claim locally, mirroring the
hook, so the screen matches what the server will store.

The button toggles in the UI, but the operation is absolute. `app.js` decides
from the row as currently shown: claimed (by anyone) sends `claimed: false`,
unclaimed sends `claimed: true`. Repeated delivery is therefore harmless.

### Row data and display

`buildRows` adds `claim: 'mine' | 'other' | null` to each row, and
`claimant`, the claimant's display name, which the claim button's label
needs. When claimed,
`meta` becomes "Du besorgst das" or "<name> besorgt das" (with "Unbekannt" for
an unknown id) instead of the creator and editor text. `render()` sets
`li.dataset.claim` and the claim button's state.

The button sits between the label and the edit button and is hidden on
checked-off rows. It reuses the `.edit` styling (44 px, no border) with a
raised-hand icon as inline SVG: outline when unclaimed, filled when claimed.
Its `aria-label` and `title` say what a tap does: "Besorge ich" when
unclaimed, "Markierung entfernen" on one's own claim and "Markierung von
<name> entfernen" on someone else's. It stays enabled offline and on pending
rows, since it goes through the outbox. The focus restore in `render()` learns
about `.claim`.

Colors: one new token `--claim`, a calm blue with a light value (around
`#2f6fb3`) and a dark value (around `#6fa8e6`). Blue is the one hue the app
does not use yet: green means connected, red means error or delete, and
amber means pending sync and the offline banner. A claimed row gets a subtle
background tint mixed from that token: about 18 % for one's own claim and
about 9 % for someone else's, via `.item[data-claim="mine"]` and
`.item[data-claim="other"]`. Own and other claims are also told apart by the
text ("Du" vs a name), so the shade difference only has to be noticeable,
not readable on its own. The pending marker ("nicht synchronisiert") stays
text, so it is never confused with a claim.

Alternatives considered:
- Orange for own claims and yellow for others. Rejected because amber
  already means "pending sync" in the status bar, so a claimed row could be
  read as not yet synchronized.
- A colored stripe at the row's edge instead of a background. Rejected: the
  background is easier to spot at a glance, and one signal is enough.
- Coloring the whole row background strongly. Rejected because it competes
  with the text.
- Putting the claim into the edit dialog or a long-press. Rejected in
  discovery: the claim should be one tap on the way out of the door.

## Risks / Trade-offs

- [Three buttons make the check-off area narrower on phones] → About 44 px
  more is taken. The layout e2e test is extended to cover the claim button,
  and the phone check in the pending design round covers how it feels.
- [The two shades are too close or too faint on some screens] → The text
  carries the distinction; the design round may tune the percentages and the
  token without spec changes.
- [A stale release removes a newer claim] → Accepted; one tap restores it.
- [An offline claim arrives after someone else bought the item] → The
  check-off wins on the server because claims on checked items are dropped.
- [Older cached app versions do not know the claim] → They ignore the new
  fields and show creator and editor as before. Their check-off still clears
  the claim, because the hook does it.

## Migration Plan

Deploy as usual: tag checkout and container restart. PocketBase applies the
new migration on startup; existing items get empty claim fields. To roll back,
check out the previous tag and run `migrate down 1`, which removes both
fields and with them any current claims.
