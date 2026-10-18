# Design

## Context

See proposal.md for the motivation and the specs for the required behavior.

Relevant current state:

- The header holds the app name and an `.account` block with the user name and a plain "Abmelden" button. `logout()` in `app.js` clears the session and calls `store.clear()`, which also drops the outbox.
- Deleting an open item already asks for confirmation through `<dialog class="confirm">` with a `method="dialog"` form. The existing e2e tests rely on finding it by role `dialog`.
- `app.js` tracks a `connection` state (`connecting`, `online`, `offline`). Pending changes are `outbox.list()`. The list stays current while online through realtime events, and `sync.flush()` reloads the whole list after sending pending changes.
- The CSP forbids inline scripts and styles. New files in `pb_public/` must be listed in `SHELL` in `sw.js`, which a test enforces.
- Nothing in the repository carries an app version yet.

## Goals / Non-Goals

**Goals:**

- Keep all new text logic DOM-free and unit-tested, in line with the existing module split.
- Show a "last synchronized" time that matches what the user actually saw, even when the list was kept current by realtime rather than by reloads.

**Non-Goals:**

- More menu entries than "Abmelden". The menu is the place for them later.
- A manual "sync now" action, or a status bar that can be tapped.
- Automating the version bump with a make target or a deploy script.

## Decisions

### Account menu uses the `popover` attribute

The user name becomes a `<button>` (name plus a small chevron) with `popovertarget` pointing at a `<div popover>` that holds the "Abmelden" button. The browser then handles opening, closing on outside tap and Escape, and `aria-expanded`, without any JavaScript. Choosing "Abmelden" hides the popover and opens the logout dialog.

Alternatives: `<details>` works everywhere but does not close on an outside tap. A hand-written menu needs focus and outside-click handling that the browser already provides.

A browser without popover support ignores the attribute and shows the menu content inline next to the name. Logout then stays reachable, only less hidden.

### The menu reads as a layer above the page

A first device check showed the menu sitting on top of the green "Hinzufügen" button and looking like one more button of the same kind. The menu is therefore styled as a distinct card: a raised surface color (a new `--raised` token, lighter than `--surface` in dark mode), a clear shadow, a minimum width of about 12rem, a header line "Angemeldet als" with the display name, and "Abmelden" with a logout icon in the danger color. While it is open, `::backdrop` of the popover dims the rest of the page slightly, so the covered button recedes. This needs no JavaScript, and a tap on the dimmed area closes the menu as before.

Letting the menu push the content down instead of covering it was rejected: the layout would jump every time the menu opens.

### A separate logout dialog

A second `<dialog class="confirm" id="confirm-logout">` with "Abbrechen" and a `danger` "Abmelden" button, wired like the delete dialog. Its question comes from a pure function `logoutQuestion(pendingCount)`:

- 0: "Wirklich abmelden?"
- 1: "1 Änderung ist noch nicht übertragen und geht beim Abmelden verloren. Trotzdem abmelden?"
- n: "n Änderungen sind noch nicht übertragen und gehen beim Abmelden verloren. Trotzdem abmelden?"

Making the delete dialog generic was considered. It would touch tested delete behavior for no gain, since the shared look already comes from the `confirm` class.

### Two indicators, each from a pure function

The status bar shows the connection and the synchronization state separately, because they can differ: the app can be connected while it is still sending changes, or offline with a list that was current an hour ago. Two pure functions in `view.js` return `{ state, text }`, and the CSS maps `state` to the dot color:

| `connectionIndicator(connection)` | state  | text        |
|-----------------------------------|--------|-------------|
| `connecting`                      | `busy` | "Verbinde …" |
| `online`                          | `ok`   | "Verbunden" |
| `offline`                         | `error`| "Offline"   |

| `syncIndicator({ connection, pending, lastSync, now })` | state     | text                                   |
|---------------------------------------------------------|-----------|----------------------------------------|
| online, no pending changes                              | `ok`      | "Synchronisiert"                       |
| online, n pending                                       | `busy`    | "Sende 1 Änderung" / "Sende n Änderungen" |
| not online, with `lastSync`, nothing pending            | `idle`    | "Stand heute, 14:32" / "Stand gestern, 18:05" / "Stand 15.10., 09:10" ("30.12.25" with a two-digit year only if not the current one) |
| not online, with `lastSync`, changes pending            | `pending` | same text as above                     |
| not online, no `lastSync`                               | `idle` or `pending` | "Noch nicht synchronisiert"  |

Colors: `ok` green (`--accent`), `busy` and `pending` yellow (a new `--warn` token), `error` red (`--danger`), `idle` grey (`--muted`). `busy` dots pulse gently; the animation is switched off under `prefers-reduced-motion`. The text is always shown, so no state depends on color alone.

The texts are short on purpose: both indicators and the version must fit in one line on a 360 px screen without being cut off. A screenshot check showed that a full date with year did not fit next to "Verbinde …", so the year is left out for dates in the current year and shortened to two digits otherwise. Measured at 360 px, the footer also needed slightly tighter gaps and a smaller version text; an e2e test checks the longest texts for cut-off. "Stand …" replaces the longer "Zuletzt synchronisiert: …" of the first draft, and the version drops its "v" prefix.

Dates are formatted from local `Date` getters, comparing calendar days of `lastSync` and `now`. Tests build both dates with the local `Date` constructor, so they pass in any time zone. Absolute times instead of "vor 5 Minuten" avoid a ticking timer and stay true after an offline restart.

### What counts as "last synchronized"

The list is current for as long as the app is online, because realtime events keep it up to date. Storing only the time of the last successful reload would show a time hours too old after a long online session. So the time is recorded whenever the app knows it is current at that moment:

- after a successful reload in `sync.flush()`,
- when the connection leaves `online`,
- when the page becomes hidden while online, which covers closing the app or switching away.

`sync.js` gets a `markSynced()` that stores the current time under `lastSync` in the store, with `now` injectable for tests as in `outbox.js`. The reload uses it internally, and `app.js` calls it for the other two moments. The value lives in the per-user store, so it disappears on logout and when another user claims the device, together with the list it describes.

Offline detection can lag by a few seconds when the realtime stream breaks quietly, so the recorded time may be slightly later than the real loss of connection. That is accurate enough for a hint.

### Status bar layout

A `<footer class="footer">` fixed to the bottom of the viewport, full width with its content aligned to the same centered column as the header. The two indicators sit on the left as small chips, each a dot plus text on a faintly tinted background in the dot's color. The version sits on the right in small muted type. The bar itself has a translucent surface color with `backdrop-filter: blur(…)`, so the list shows through faintly when scrolled under it, and only a very light top border instead of a hard line.

Its bottom padding includes `env(safe-area-inset-bottom)`, and `main` gets enough bottom padding that the last item is never hidden behind it. The sync chip truncates its text with an ellipsis rather than wrapping or pushing the page wider. The footer has no live region: the top notice already announces going offline, and a live region here would announce every sync.

On the login screen the indicators are hidden and only the version is shown.

### Version in a tracked module

`pb_public/js/version.js` exports `VERSION` as a string, for example `'2026.10.18.0'`. It is a normal module listed in `SHELL`, so the shown version is always the one of the running code, including from the offline cache. A unit test checks the value against the `YYYY.0M.0D.MICRO` pattern and that month and day form a real date, so a malformed bump fails `make test`.

A version file written during deployment was rejected: a file missing from `SHELL` makes `cache.addAll` fail and the service worker would not install, and the deploy would gain a step.

## Risks / Trade-offs

- [The version is not bumped before a deploy] → The bump is a step in the README's update instructions. The footer then shows the previous version, which is imprecise but harmless.
- [Popover unsupported on an old device] → The menu content shows inline instead, so logout stays possible.
- [Fixed footer covers content when the on-screen keyboard is open on Android] → The input sits at the top of the list, so the covered area at the bottom is not where the user is typing.
- [Existing e2e tests click "Abmelden" directly] → They are updated to open the menu and confirm, through one shared helper.

## Migration Plan

Frontend only, deployed with the usual `git pull` and restart. Devices load the new frontend on their next start with a connection. Stored data needs no migration: a missing `lastSync` shows "Noch nicht synchronisiert" until the first sync.
