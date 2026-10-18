# Tasks

## 1. Server records and clears claims

- [x] 1.1 Write failing API tests in `tests/api/items.test.mjs` (or `item-metadata.test.mjs`, matching where author tests live): claiming an open item stores the requester as `claimedBy` with a `claimedAt`; a forged claimant becomes the requester; releasing clears both fields, also for someone else's claim; a repeated claim by the same user keeps the first `claimedAt`; claiming a checked item leaves it unclaimed; checking off a claimed item clears the claim and un-checking does not restore it; a claimant sent on create is ignored; claiming and releasing set `updatedBy`; deleting the claimant's account leaves the item unclaimed; verify they fail
- [x] 1.2 Add a new migration in `pb_migrations/` that adds `claimedBy` (relation to users, `maxSelect: 1`, no cascade) and `claimedAt` (date) to `items`, with a down migration that removes them; verify the field API against the pinned PocketBase version's docs and leave existing migrations untouched
- [x] 1.3 Extend `applyMemberWrite` in `pb_hooks/items.js` with the claim rules from design.md; verify the tests from 1.1 pass
- [x] 1.4 Verify by hand on a local `pb_data/` that `migrate down 1` removes both fields and `migrate up` adds them again

## 2. Claims expire

- [x] 2.1 Write failing tests in `tests/api/cleanup.test.mjs`: a claim older than 3 hours is released by the cleanup route, a recent claim stays, `updatedBy` is unchanged after release, the route reports `released`, and a realtime subscriber receives an update event for the released item; verify they fail
- [x] 2.2 Add `releaseExpiredClaims(app)` to `pb_hooks/items.js` and call it from the cron and the route in `pb_hooks/cleanup.pb.js`, returning `{ deleted, released }`; verify the tests from 2.1 and the existing cleanup tests pass

## 3. Outbox, sync and view

- [x] 3.1 Write failing unit tests in `tests/unit/sync.test.mjs`: a pending `setClaimed` with `claimed: true` is sent as an update with `claimedBy` set to the logged-in user's id, with `claimed: false` as `claimedBy: ''`, and one for a deleted item (404) is dropped quietly; reloads keep `claimedBy` and `claimedAt`
- [x] 3.2 Support `setClaimed` in `pb_public/js/sync.js` (`send`, `classify`, `ITEM_FIELDS`) and document it in the header comment of `pb_public/js/outbox.js`; verify the tests from 3.1 and the existing sync tests pass
- [x] 3.3 Write failing unit tests in `tests/unit/view.test.mjs`: rows report `claim` as `'mine'`, `'other'` or `null`; a claimed row's `meta` is "Du besorgst das" or "<name> besorgt das" ("Unbekannt" for an unknown id); a pending `setClaimed` claims or releases an open item, marks it pending with me as last editor and is ignored for a checked item; a pending `setChecked(true)` clears the claim
- [x] 3.4 Implement the claim in `buildRows` (`pb_public/js/view.js`); verify the tests from 3.3 and the existing view tests pass

## 4. Claim button and highlight

- [x] 4.1 Write a failing e2e spec `tests/e2e/claim.spec.mjs`: Anna claims "Milch", sees "Du besorgst das" and Ben sees "Anna besorgt das" live, with different `data-claim` values; Ben's tap removes Anna's claim and a second tap claims it for Ben; checking off a claimed item removes the claim and checked rows show no claim button; the button's accessible name follows the state ("Besorge ich", "Markierung entfernen", "Markierung von Anna entfernen"); claiming while offline (via `goOffline`) shows the claim as not synchronized and Ben sees it after `goOnline`
- [x] 4.2 Add the claim button (raised-hand icon, outline and filled variants) before the edit button in the item template in `pb_public/index.html`; add the `--claim` token (blue) with light and dark values and the background tints for `data-claim="mine"` (stronger) and `"other"` (lighter) in `pb_public/app.css`
- [x] 4.3 Wire the button in `pb_public/js/app.js`: set `data-claim`, the icon state, `aria-label` and `title`, hide it on checked rows, add `setClaimed` with the opposite of the shown state, then render and flush; restore focus to `.claim` after a re-render; verify the e2e spec from 4.1 passes
- [x] 4.4 Extend `tests/e2e/layout.spec.mjs` so the 360 px check covers a claimed row with three buttons: no horizontal scrolling, 44 px targets and the check-off label filling the rest; verify it passes

## 5. Documentation and integration

- [x] 5.1 Check `README.md` and `AGENTS.md` for descriptions of item fields, outbox operations or what the cleanup does, and update what this change made stale; verify each change by reading the matching code
- [x] 5.2 Run `make test` and verify that the unit, API and e2e suites all pass

## Workflow follow-up

- Deploy, then check on a phone how the claim button looks and whether the two blue shades are easy to tell apart in light and dark mode (part of the pending design round).
- Later: combine with `add-clear-checked-items` into multi-item actions, including claiming several items at once.
- Archive the change with `/opsx:archive` (sync specs) before committing, so code, main specs and the archived change land in one commit.
