# Design

## Context

See proposal.md for the motivation and `specs/item-suggestions/spec.md` for
the requirements.

The current state that shapes the approach:

- `pb_hooks/items.pb.js` runs `applyMemberWrite` (`pb_hooks/items.js`) in
  `onRecordUpdateRequest` for every non-superuser update, then calls
  `e.next()`, which saves the record. `applyMemberWrite` already tells the
  transitions apart: it sets `checkedAt` only when an item goes from open to
  checked, and keeps it when an already checked item is checked again. That
  is what makes a repeated offline check-off harmless today.
- PocketBase runs each hook handler in its own context; shared code lives in
  `pb_hooks/*.js` modules loaded with `require()` inside the handler.
- The hourly cron and the superuser route `POST /api/einkauf/cleanup` in
  `pb_hooks/cleanup.pb.js` run `deleteOldCheckedItems` and
  `releaseExpiredClaims`. The API tests read the route's response field by
  field, so a new field does not break them.
- `sync.reload()` loads items and users in parallel into the stored
  `snapshot` (`{ items, users }`), which the app keeps across restarts and
  uses offline. `withEvent` spreads the snapshot, so extra keys survive
  realtime events.
- `app.js` is DOM wiring only; logic lives in DOM-free modules with unit
  tests. New files in `pb_public/` must be listed in `SHELL` in `sw.js`. The
  CSP forbids inline scripts and styles, and item text is only set with
  `textContent`.
- The add form (`#add-form`, `#new-item`) is sticky at the top of the list.
  A non-empty add field already keeps `reloadIfIdle` from reloading.
- The general API rate limit is 300 requests per 10 seconds, so a third
  request per reload is no concern.

## Goals / Non-Goals

**Goals:**
- Counting happens only on the server, at the transition the hook already
  detects, so the client and the outbox need no changes for it.
- Ranking and matching are a pure function with unit tests; `app.js` only
  wires it to the field.

**Non-Goals:**
- Exact counts under concurrency. Two family members checking off the same
  new text in the same instant may lose one count.
- Live updates of suggestions through realtime.
- Sharing the normalization code between server and client.

## Decisions

### A `purchases` collection with a unique key

Fields: `key` (text, required, max 200, unique index), `text` (text,
required, max 200), `count` (number, integer, min 0), `lastAt` (date). The
key is the trimmed text in lower case with runs of whitespace collapsed to
one space, so "Milch", "milch" and "Milch " share one record. `text` keeps
the spelling of the last check-off and is what the app shows.

List and view rules are the family-member check used for items. Create,
update and delete rules are `null`, so only the superuser and server code
can write. Hooks write through `e.app`, which is not subject to collection
rules.

Alternative considered: deriving suggestions from the items collection by
keeping checked items longer. Rejected because it changes the 24-hour
cleanup and fills the list data with history the app does not show.

### Counting in the update request hook, after the save

In `onRecordUpdateRequest`, the handler reads the transition before
`e.next()` (original `checked` against the new `checked`) and the item's
text as it will be saved, then calls `e.next()`. Only after the save
succeeded does it record the purchase, so a refused update never counts.
The purchase write is wrapped in try/catch and logged with
`e.app.logger().error`, so the item change stands even if the purchase write
fails, as the spec requires.

The logic lives in a new module `pb_hooks/purchases.js` with
`recordPurchase(app, text)`, `takeBackPurchase(app, text)`,
`expirePurchases(app)` and the key normalization:

```
 open -> checked     recordPurchase: find by key; create {count 1} or
                     count + 1; text = current spelling; lastAt = now
 checked -> open     takeBackPurchase: find by key; missing -> nothing;
                     count - 1; at 0 -> delete
 checked -> checked  nothing (repeated delivery)
 open -> open        nothing (text edits, claims)
```

Superuser requests are skipped, as `applyMemberWrite` skips them, so test
setup and the admin UI do not count purchases. Creates are not counted: the
app never creates checked items.

Alternative considered: `onRecordAfterUpdateSuccess`. Rejected because it
also fires for server-side saves such as the claim expiry, and the original
state is harder to get there than in the request hook, where
`applyMemberWrite` already reads it.

### Expiry with the existing cleanup

`expirePurchases` deletes purchases with `lastAt` older than 90 days, using
the same string-comparable date cutoff as the item cleanup. The cron and the
cleanup route call it after the existing steps; the route adds `expired` to
its response.

### Suggestions loaded with the snapshot

`reload()` stores items and users first and carries the previous
`snapshot.purchases` over. Only then does it start `loadPurchases()` without
awaiting it, which fetches `purchases` with `fields: 'id,text,count'` and
replaces `snapshot.purchases` on success. Typing never touches the network;
suggestions always come from the stored snapshot.

Loading purchases is deliberately decoupled from the list. Fetching them in
the same `Promise.all` as items and users was the first version and had two
flaws: a slow purchases response delayed the list, and a failed one (for
example a 500, or a 404 during a botched rollout) failed the whole reload, so
the list stayed stale and the app could even show "Offline". Now a failure is
only logged with `console.warn` and the old purchases stay; nothing reaches
`classify`, `onOffline` or `onRejected`. A flag keeps a second request from
starting while one is still running, so a hanging connection does not
collect requests. A response arriving after logout finds no snapshot and is
dropped, so no data returns to the device. A successful load calls a
separate `onPurchases` callback, which only refreshes the suggestions;
calling `onChange` would redraw the list and the status bar for data that
neither shows.

A snapshot stored by an older version has no `purchases` key and counts as
an empty list. No realtime subscription: purchases change only on
check-offs, and the next reload picks them up.

### `suggest.js`: matching and ranking as a pure function

`suggest(purchases, query, openTexts)` returns at most 5 entries
`{ text, onList }`, or an empty list when the trimmed query has fewer than 2
characters. Comparison uses the same normalization as the server key, with
plain `toLowerCase()` on both sides, so client and server agree; German
needs no locale-specific lowering. A purchase matches when its text
contains the query; it ranks in the first group when the text or one of its
words, separated by whitespace or a hyphen, starts with the query. Within a
group, higher `count` comes first, then the text alphabetically, so the order
is deterministic. `onList` is true when the normalized text equals an open
item's normalized text.

The normalization exists twice, in `pb_hooks/purchases.js` and in
`suggest.js`, because hooks cannot import browser modules. Both get unit or
API tests with the same examples ("Milch " and "milch" match, "Milch 2x"
does not).

### The suggestion list as an ARIA combobox

`#new-item` gets `role="combobox"`, `aria-autocomplete="list"`,
`aria-controls="suggestions"` and `aria-expanded`. A `<div id="suggestions"
role="listbox">` inside the add form holds `<div role="option">` entries (a
list element must not take an interactive role); an
item already on the list gets `aria-disabled="true"`, a muted style and the
note "steht schon drauf". The keyboard selection is shown with
`aria-activedescendant` and a selected style. The list is positioned below
the field over the top of the item list, using existing tokens from
`app.css` `:root`, and follows `docs/design.md`.

Wiring in `app.js`:
- `input` on the field recomputes the suggestions; `render()` recomputes
  them while the list is open, so "steht schon drauf" follows live changes.
- `pointerdown` on an option calls `preventDefault()`, so the field keeps the
  focus and the phone keyboard stays open; `click` adds the option through
  the existing `addItem`, clears the field and hides the list.
- `keydown` on the field: arrow keys move the selection over selectable
  options, Enter with a selection adds it and prevents the form submit,
  Escape hides the list. Enter without a selection submits as before.
- The list hides on blur of the field and after the form is submitted.

## Risks / Trade-offs

- [Two simultaneous first check-offs of the same text: both find no record,
  the second create fails on the unique index] → Logged and lost as one
  count; acceptable for a ranking hint.
- [The purchase write is not in the same transaction as the item save, so a
  crash between both loses one count] → Acceptable for the same reason, and
  it keeps a failing purchase write from blocking the check-off.
- [Un-checking after an edit takes back nothing, leaving one extra count on
  the old text] → Accepted in exploration; rare and harmless.
- [Variants like "Milch 2x" become separate suggestions] → Accepted; a
  quantity field is a separate change.
- [The suggestion list covers the first rows of the list while typing] →
  At most 5 entries, and only while typing; it hides on blur and submit.
- [Normalization drifts between server and client] → Both are tested with
  the same examples.

## Migration Plan

Deploy as usual: the migration creates the empty `purchases` collection, and
suggestions grow from the first check-off after the deploy. Rollback:
`migrate down` deletes the collection, then deploy the previous release; an
old client never requests purchases, and a stored snapshot with a
`purchases` key is harmless to it.
