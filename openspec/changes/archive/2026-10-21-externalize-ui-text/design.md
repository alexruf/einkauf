# Design

## Context

See proposal.md for the motivation and the delta spec for the
requirements.

The current state that shapes the approach:

- `index.html` holds about 35 texts: headings, labels, buttons,
  `aria-label`, `title` and `placeholder` attributes, the empty state, the
  install hint with two ordered lists, and the row and edit templates.
  Almost everything is `hidden` until `app.js` has run, so texts filled in
  at start are never seen missing. The only visible element before that is
  the app name in the header and in `<title>`, which `showAppName` already
  overwrites from the configured name.
- `app.js` sets about a dozen texts: the session and rejection notices,
  the offline notice, the duplicate notice `„…“ steht schon drauf.`, the
  claim button labels, `Erledigt (n)`, the "steht schon drauf" note in
  suggestions and three login errors.
- `view.js` builds the meta line (`von …`, `zuletzt …`, `… besorgt das`,
  `Unbekannt`), the status bar texts with a hand-written singular and
  plural, the logout question and `formatSyncTime`, which builds
  "heute, 14:32", "15.10., 09:10" and "30.12.25, 17:45" by hand.
- The rows are cloned from `<template>` elements. A template's content is
  a separate document fragment, so `document.querySelectorAll` does not
  reach it.
- No build step, no npm, strict CSP (`script-src 'self'`, `connect-src
  'self'`), texts only through `textContent`. New files in `pb_public/`
  must be listed in `SHELL` in `sw.js`, which an e2e test enforces.
- The unit and e2e tests assert the German texts literally, for example
  `getByRole('button', { name: 'Speichern' })` and `'Sende 2 Änderungen'`.

## Goals / Non-Goals

**Goals:**
- One place per language holds every user-facing text. Adding a language
  means writing a catalog and selecting it, without touching markup or
  logic.
- Lookup, placeholders, plurals and date formatting are pure functions
  with unit tests; `app.js` only applies them to the DOM.
- Nothing visible changes. The existing tests stay as they are and prove
  it.

**Non-Goals:**
- Selecting a language at runtime, from the browser or a setting.
- Translating the web app manifest or the configured app name.
- Translating developer-facing messages (console output, thrown errors).
- Typographic separators that carry no language: the middle dot before a
  note in a row (`· 2x`) stays in `app.js`.

## Decisions

### Catalog as an ES module of plain data

The German catalog is `pb_public/js/messages/de.js`, exporting one flat
object `messages` from keys to values. A value is either a string with
named placeholders (`'{name} besorgt das'`) or, for texts that depend on a
count, an object of plural forms keyed by `Intl.PluralRules` categories
(`{ one: 'Sende {count} Änderung', other: 'Sende {count} Änderungen' }`).
Values never contain functions or markup, so a translator works with
plain text.

Keys are English, dot-separated by area and stable: `login.title`,
`login.error.credentials`, `item.claim.mine`, `sync.sending`,
`logout.question`, `install.ios.step2`. A key names the purpose, not the
German wording, so rewording a text does not rename its key.

A JSON file was the alternative. It would need a `fetch` at start, a
second path into the offline cache and asynchronous startup before the
first render. An ES module is imported like every other module, cached by
the service worker through `SHELL` and available synchronously.

### `i18n.js`: a small factory plus the German instance

`pb_public/js/i18n.js` exports `createI18n({ locale, messages })`, which
returns:

- `t(key, params)`: looks the key up, picks the plural form from
  `params.count` when the value is an object, and replaces each
  `{placeholder}` with the matching param.
- `tParts(key)`: the same text split into literal strings and placeholder
  names, for the one place where a value is an element rather than text
  (see below).
- `formatTime(date)` and `formatDate(date, { year })`: `Intl.DateTimeFormat`
  for the locale, with two-digit hour, minute, day and month, and a
  two-digit year only when asked.

The module also exports `LOCALE = 'de'` and the German instance's
functions, so `view.js` and `app.js` import `t` directly, as they import
other modules. The factory keeps the logic testable with small fake
catalogs, the same way `createStore` and `createPrefs` take their storage.

A missing key, a missing placeholder value, a placeholder the text does
not contain and a plural value without an `other` form each throw an
`Error` naming the key. Showing the key instead would hide the mistake
until someone notices it on a phone.

### Markup: `data-i18n` attributes, applied once at start

Elements carry their key instead of their text:

```html
<button type="submit" class="primary" data-i18n="login.submit"></button>
<input ... data-i18n-placeholder="add.placeholder" data-i18n-aria-label="add.label">
```

`data-i18n` sets `textContent`; `data-i18n-aria-label`, `data-i18n-title`
and `data-i18n-placeholder` set the attribute of that name. Where text and
markup are mixed, the text gets its own element: the label texts of the
login fields become a `<span>` before the input (the label is a grid, so a
span lays out like the text node it replaces), the logout menu item's text
becomes a `<span>` after its icon, and the empty state becomes two keys
for its two sentences.

At start, before the first screen is shown, `app.js` applies the keys to
`document` and to the content of each `<template>`. Every clone then
already has its texts, so rendering rows needs no extra step. This
function touches the DOM, so it lives in `app.js`; the lookup it uses is
in `i18n.js`.

The app name is configured data, not catalog text. `<title>` and
`#app-name` keep "Einkauf" in the markup, so a tab title exists before the
script runs, and the markup check exempts both.

Biome's accessibility rules read the static markup, so they see headings and
labels without text (`useHeadingContent`, `noLabelWithoutControl`). Those
findings are false positives, because the text arrives at start, and each
one is suppressed with a `biome-ignore` comment that says so.

`app.js` also sets `document.documentElement.lang` from `LOCALE`. The
static `lang="de"` stays, so screen readers and hyphenation are right
before the script runs.

### A name inside a styled element: `tParts`

The account menu header reads "Angemeldet als **Anna**", with the name in
a `<strong>`. Splitting it into a fixed "Angemeldet als" plus the name
would fix the German word order. Instead the catalog has
`'account.signedInAs': 'Angemeldet als {name}'`, and `app.js` builds the
header from `tParts`, putting the `<strong>` where `{name}` is. The name
still only reaches the DOM through `textContent`.

### Dates: Intl for the numbers, the catalog for the words

`formatSyncTime` keeps its logic (today, yesterday, this year, earlier
year) and gets its pieces from `i18n.js`: `formatTime` gives "14:32",
`formatDate` gives "15.10." or "30.12.25", and the catalog combines them:
`'time.today': 'heute, {time}'`, `'time.yesterday': 'gestern, {time}'`,
`'time.date': '{date}, {time}'`, wrapped by `'sync.since': 'Stand {when}'`.

`Intl.RelativeTimeFormat` was considered for "heute" and "gestern". It
would give the words, but not the way they combine with the time, so the
catalog would need patterns anyway.

The exact `Intl` output for `de` must match today's strings. The first
task checks it in Node (unit tests) and Chromium (e2e). If one of them
differs, for example in punctuation, `formatDate` builds the date from
`formatToParts` with a pattern from the catalog instead, which is still
translatable.

### What stays a decision in code

Which message is shown remains logic: `logoutQuestion(0)` asks
`logout.question`, any other count `logout.questionPending` with
`{count}`. Zero pending changes is a different question, not a plural
form, so it is a separate key rather than a `zero` category, which German
does not have.

### Checks that keep texts in the catalog

- A unit test reads `index.html` and every file in `pb_public/js/` and
  collects the keys of all `data-i18n*` attributes and all `t('…')` and
  `tParts('…')` calls. Every collected key must exist in the German
  catalog, and every catalog key must be collected. Keys are therefore
  always string literals in the source, never built at runtime; the
  module comment of `i18n.js` says so.
- An e2e test loads `index.html` as served, parses it with `DOMParser`
  (which runs no scripts) and walks every element, including template
  contents. Apart from `<title>`, `#app-name`, `<script>` and `<style>`,
  no element may have a text node with non-whitespace content, and no
  element may have a non-empty `aria-label`, `title`, `placeholder` or
  `alt` attribute. Parsing in the browser handles templates and nesting
  correctly, which a regular expression in Node would not.

## Risks / Trade-offs

- [`index.html` no longer reads as the screen it describes] → Keys name
  their purpose (`install.android.step3`), and the catalog lists them in
  the order of the page.
- [`Intl` output differs between Node, Chromium and Safari] → The first
  task checks it in Node and Chromium; the fallback with `formatToParts`
  is decided there. Safari's ICU data matches Chromium's for these simple
  numeric formats, but this is not covered by an automated test.
- [A text is added later as a literal in `app.js`] → The markup check
  catches it in `index.html`, but not in JavaScript. `AGENTS.md` states the
  rule, and a review should catch it; a lint rule for German literals
  would produce false positives on comments and console messages.
- [Startup throws on a missing key, and the app shows nothing] → That is
  intended to fail fast, and the key check fails before any such version
  is released.

## Migration Plan

Frontend only, deployed like any release. A device running the cached old
version keeps working and switches on the next start. Rollback is a
revert.
