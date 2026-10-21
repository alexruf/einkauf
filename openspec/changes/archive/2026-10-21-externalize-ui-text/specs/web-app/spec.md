# Spec Delta

## ADDED Requirements

### Requirement: Texts come from a message catalog
All text shown to users, including accessible names, tooltips and placeholders, SHALL come from one message catalog per language, addressed by stable keys. The page markup SHALL contain no user-facing text of its own. The configurable app name is not catalog text. A key that the catalog lacks SHALL be reported as an error and SHALL NOT be shown in place of the text.

#### Scenario: Texts are unchanged
- **WHEN** a user opens the login screen, the list, the edit mode of an item or the logout dialog
- **THEN** every text, accessible name, tooltip and placeholder is the same German text as before the catalog existed, for example "Anmelden", "Was wird gebraucht?", "Menge oder Hinweis", "Speichern" and "Wirklich abmelden?"

#### Scenario: Markup holds only keys
- **WHEN** the page markup, including the templates for rows and the edit mode, is read without running scripts
- **THEN** no element has visible text or an accessible name, tooltip or placeholder that is not a catalog key, apart from the app name

#### Scenario: Missing key
- **WHEN** the markup or the code uses a key that the German catalog does not have
- **THEN** the automated checks fail and name the key

#### Scenario: Unused key
- **WHEN** the German catalog has a key that neither the markup nor the code uses
- **THEN** the automated checks fail and name the key

### Requirement: The catalog places values and chooses plural forms
Names, counts, dates and times SHALL be inserted into named placeholders of the catalog text, so the catalog decides where they go. A text that depends on a count SHALL have its forms chosen by the plural rules of the catalog's language. Dates and times SHALL be formatted by the conventions of that language; words around them such as "heute" or "gestern" SHALL come from the catalog.

#### Scenario: Count of one
- **WHEN** the app is online and sends 1 pending change
- **THEN** the sync indicator shows "Sende 1 Änderung"

#### Scenario: Count of several
- **WHEN** the app is online and sends 2 pending changes
- **THEN** the sync indicator shows "Sende 2 Änderungen"

#### Scenario: Name in a text
- **WHEN** Anna has claimed an item and Ben looks at it
- **THEN** its meta line shows "Anna besorgt das"

#### Scenario: Date and time in a text
- **WHEN** the app is offline and the list was last known to be current on 15 October of the current year at 09:10, before yesterday
- **THEN** the sync indicator shows "Stand 15.10., 09:10"
