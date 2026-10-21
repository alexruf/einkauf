# Proposal

## Why

Every text the app shows is written directly into `index.html`, `app.js`
and `view.js`, and some of the German grammar is code: the plural of
"Änderung", the word order of "Anna besorgt das" and the hand-built date
"heute, 14:32". There is no plan to offer another language yet, but if one
comes, today it would mean changing markup and logic in many places. Moving
all texts into one catalog now, while the app is small, keeps a later
translation down to writing a second catalog.

## What Changes

- All text shown to users lives in one German message catalog, keyed by
  stable English keys. Nothing visible changes: every screen shows exactly
  the texts it shows today.
- `index.html` keeps only keys. Text content and the `aria-label`, `title`
  and `placeholder` attributes are filled from the catalog at start,
  including the row and edit templates.
- `app.js` and `view.js` look texts up by key and pass values such as names
  and counts as named placeholders, so a catalog can put them where its
  language needs them.
- Plurals are chosen by the language's plural rules (`Intl.PluralRules`),
  and dates and times are formatted for the locale (`Intl.DateTimeFormat`).
  The words and the order around them ("heute, 14:32", "Stand …") come
  from the catalog.
- A key used in code or markup that the catalog lacks is an error, not a
  silent fallback. Tests ensure that every used key exists, that the
  catalog has no unused keys, and that `index.html` contains no text
  outside the catalog.
- Out of scope: choosing or switching the language, a second catalog, the
  web app manifest (name, description), the configurable app name and its
  fallback "Einkauf", and developer-facing console and error messages,
  which stay English in the code.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `web-app`: a new requirement that all text shown to users comes from a
  message catalog, with plurals and dates chosen by the locale rather than
  by code. The German user interface requirement is unchanged.

## Impact

- `pb_public/js/`: a new DOM-free module `i18n.js` (lookup, placeholders,
  plurals, date and time formatting) and the catalog
  `messages/de.js`, both with unit tests and `SHELL` entries in `sw.js`.
  `view.js` and `app.js` use keys instead of literal texts; `app.js` fills
  the markup and templates at start.
- `pb_public/index.html`: text replaced by `data-i18n` keys; mixed text and
  markup (the empty list, the account menu header, labels with an input)
  gets its text in its own element.
- Tests: new unit tests for `i18n.js` and the key checks; the existing unit
  and e2e tests stay unchanged and keep asserting the German texts, which
  proves nothing visible changed.
- Docs: `AGENTS.md` (module list, rule that UI text goes through the
  catalog), `README.md` if it describes where texts live.
- No server, schema or dependency change. A cached old version keeps
  working until it updates, since nothing it talks to changes.
