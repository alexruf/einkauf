# Spec Delta

## ADDED Requirements

### Requirement: Adding an item already on the list
When a user adds a text that equals an open item, ignoring upper and lower case and extra spaces, the app SHALL add nothing. It SHALL clear the add field, keep the focus in it, scroll the existing row into view, highlight that row for about 2 seconds and show "„<text>“ steht schon drauf." in the status bar, with the text as the existing item shows it. Checked-off items SHALL NOT count as open.

#### Scenario: Typing an open item's text
- **WHEN** "Milch" is an open item and the user enters "milch " and confirms
- **THEN** no item is added, the add field is empty and keeps the focus, the row "Milch" is highlighted and the status bar says "„Milch“ steht schon drauf."

#### Scenario: Existing row out of view
- **WHEN** the open item "Milch" is scrolled out of view and the user adds "Milch"
- **THEN** the list scrolls until the row "Milch" is visible

#### Scenario: Checked-off item with the same text
- **WHEN** "Brot" was checked off and the user adds "Brot"
- **THEN** an open item "Brot" is added

#### Scenario: Different text
- **WHEN** "Milch" is an open item and the user adds "Milch 2x"
- **THEN** an open item "Milch 2x" is added

#### Scenario: Item not synchronized yet
- **WHEN** the user added "Milch" while offline and adds "Milch" again before synchronizing
- **THEN** no second item is added and the row "Milch" is highlighted

#### Scenario: Highlight ends
- **WHEN** the row "Milch" was highlighted about 2 seconds ago
- **THEN** it looks like any other row again

#### Scenario: Reduced motion
- **WHEN** the device asks for reduced motion and a row is highlighted
- **THEN** the highlight appears and disappears without animation

### Requirement: Editing an item into one already on the list
When a user saves an open item with a text that equals another open item, ignoring case and extra spaces, the app SHALL save nothing. The row SHALL stay in edit mode with the typed text and the focus, and the other row SHALL be highlighted and announced as when adding. Checked-off items SHALL neither be checked nor count as open.

#### Scenario: Editing into an open item's text
- **WHEN** "Milch" and "Brot" are open items and the user edits "Brot" to "MILCH" and saves
- **THEN** "Brot" is unchanged and still in edit mode with "MILCH", the row "Milch" is highlighted and the status bar says "„Milch“ steht schon drauf."

#### Scenario: Changing only the case of the item itself
- **WHEN** "milch" is an open item and the user edits it to "Milch" and saves
- **THEN** the item is saved as "Milch"

#### Scenario: Editing into a checked-off item's text
- **WHEN** "Brot" was checked off, "Brötchen" is open and the user edits "Brötchen" to "Brot" and saves
- **THEN** the open item is saved as "Brot"

#### Scenario: Editing a checked-off item into an open item's text
- **WHEN** "Milch" is open, "Milch 2x" was checked off and the user edits "Milch 2x" to "Milch" and saves
- **THEN** the checked-off item is saved as "Milch"
