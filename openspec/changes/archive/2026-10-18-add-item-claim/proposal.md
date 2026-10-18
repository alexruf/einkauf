# Proposal

## Why

When a family member is about to pass a shop, they cannot tell the others that
they will get an item. Two people may then buy the same thing, or both assume
the other one does. A short signal on an open item ("Anna besorgt das") lets
the family coordinate without messaging each other.

## What Changes

- Each open item gets a claim button with a raised-hand icon next to the edit
  button. Tapping it claims the item for the user who tapped.
- The button toggles: on an unclaimed item it claims, on a claimed item it
  removes the claim, no matter who claimed it. Taking over someone else's
  claim takes two taps: remove, then claim. Anyone may remove any claim, so
  "I was quicker" needs no extra function.
- A claimed item gets a subtle background color, and the line below the text
  shows who claimed it ("Anna besorgt das", or "Du besorgst das" for one's
  own) instead of the creator and last editor. Own and other people's claims
  use two shades of the same color, the own one slightly stronger.
- Only open items can be claimed. Checking an item off removes its claim, and
  un-checking does not restore it.
- The server records who claimed the item, taken from the authenticated
  request, so a claim cannot be made in someone else's name.
- A claim expires after 3 hours. The existing hourly cleanup removes expired
  claims, so they vanish within 3 to 4 hours.
- Claiming works offline like checking off: it shows immediately, is marked as
  not yet synchronized and is sent when the connection returns. Other people
  only see it after that.
- Claiming and removing a claim are changes to the item, so they make the user
  the item's last editor and appear live on other devices.
- Out of scope: claiming several items at once (planned later together with
  `add-clear-checked-items` as multi-item actions), notifications, and a
  per-person "I am shopping now" status.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `shopping-list`: adds claiming an open item, removing a claim, expiry of
  claims, the claim display, and claiming as a change users may make through
  the API; live updates and author metadata also cover claims.
- `offline-sync`: claiming and removing a claim are changes that work offline
  and are synchronized like the others.

## Impact

- New migration in `pb_migrations/` that adds `claimedBy` (relation to users,
  no cascade) and `claimedAt` (date) to `items`; existing migrations stay
  untouched. The `updateRule` does not change.
- `pb_hooks/items.js`: `applyMemberWrite` sets or clears the claim from the
  authenticated user and clears it on check-off; the cleanup also releases
  expired claims. `pb_hooks/cleanup.pb.js`: the route reports released claims.
- `pb_public/js/outbox.js` (documented operation), `sync.js` (send it, fetch
  the new fields), `view.js` (claim state, meta text, pending claims).
- `pb_public/index.html`, `app.js`, `app.css`: claim button, background shades
  for own and others' claims.
- Tests: API tests for claiming, forging and expiry; unit tests for sync and
  view; a new e2e spec for claiming online and offline.
- No new dependencies, no new files in `pb_public/`.
