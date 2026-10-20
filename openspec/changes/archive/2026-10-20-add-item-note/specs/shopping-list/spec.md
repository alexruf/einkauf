# Spec Delta

## ADDED Requirements

### Requirement: Items have an optional note
Each item SHALL have a note besides its text, for a quantity or a hint. The note SHALL be trimmed, MAY be empty and MUST NOT exceed 200 characters. A row SHALL show a non-empty note after the text in the muted color, separated by a middle dot, for open and checked-off items alike. A long note SHALL wrap with the text and SHALL NOT be cut off.

#### Scenario: Item with a note
- **WHEN** an item has the text "Milch" and the note "2x"
- **THEN** every user sees the row as "Milch · 2x", with "· 2x" in the muted color

#### Scenario: Item without a note
- **WHEN** an item has the text "Brot" and an empty note
- **THEN** the row shows "Brot" without a middle dot

#### Scenario: Long note
- **WHEN** an item has a note too long for one line on a 360 px wide screen
- **THEN** the row shows the whole note on further lines and nothing scrolls horizontally

#### Scenario: Checked-off item with a note
- **WHEN** a user checks off "Milch · 2x"
- **THEN** "Milch · 2x" is shown in the "Erledigt" section with its note

#### Scenario: Note too long through the API
- **WHEN** a client creates an item or changes an item's note with more than 200 characters through the API
- **THEN** the request is refused and the item is not created or keeps its note

#### Scenario: Surrounding spaces in the note through the API
- **WHEN** a client creates an item with the note " 2x " through the API
- **THEN** the stored note is "2x"

#### Scenario: Note with markup
- **WHEN** a user adds an item whose note contains HTML markup
- **THEN** everyone sees exactly that text as the note and no markup is interpreted

### Requirement: A note is typed after a separator
When adding an item, the app SHALL split the entry at the first semicolon, or at the first comma that does not stand between two digits, whichever comes first. The part before SHALL become the item's text and the part after its note, both trimmed. Without such a separator, or when nothing but spaces stands before it, the whole entry, trimmed, SHALL be the text and the note SHALL be empty.

#### Scenario: Comma
- **WHEN** a user enters "Milch, 2x" and confirms
- **THEN** an item with the text "Milch" and the note "2x" is added

#### Scenario: Semicolon before a decimal comma
- **WHEN** a user enters "Sahne; 0,5" and confirms
- **THEN** an item with the text "Sahne" and the note "0,5" is added

#### Scenario: Comma before a decimal comma
- **WHEN** a user enters "Sahne, 0,5" and confirms
- **THEN** an item with the text "Sahne" and the note "0,5" is added

#### Scenario: Decimal comma without a separator
- **WHEN** a user enters "Sahne 0,5 l" and confirms
- **THEN** an item with the text "Sahne 0,5 l" and no note is added

#### Scenario: Decimal comma before a semicolon
- **WHEN** a user enters "Sahne 0,5; Bio" and confirms
- **THEN** an item with the text "Sahne 0,5" and the note "Bio" is added

#### Scenario: Comma after a number
- **WHEN** a user enters "Eier 10, Bio" and confirms
- **THEN** an item with the text "Eier 10" and the note "Bio" is added

#### Scenario: Only the first separator splits
- **WHEN** a user enters "Joghurt; Erdbeer, Bio" and confirms
- **THEN** an item with the text "Joghurt" and the note "Erdbeer, Bio" is added

#### Scenario: Separator without a note
- **WHEN** a user enters "Milch," and confirms
- **THEN** an item with the text "Milch" and no note is added

#### Scenario: Separator at the start
- **WHEN** a user enters ";2x" or ",Milch" and confirms
- **THEN** an item with the whole entry as its text and no note is added

### Requirement: Edit an item's note
In the row's edit mode, a user SHALL be able to change or clear the note of any item, open or checked off. Text and note SHALL be edited in separate fields, and neither field SHALL split its content at a separator. Saving SHALL change only what differs from the item as shown: an empty text field SHALL leave the text as it is, while an empty note field SHALL clear the note. Editing SHALL NOT change the checked state.

#### Scenario: Adding a note
- **WHEN** user B opens the edit mode of "Milch", which user A added, enters "2x" in the note field and saves
- **THEN** every user sees "Milch · 2x" with A as creator and B as last editor

#### Scenario: Clearing a note
- **WHEN** a user clears the note field of "Milch · 2x" and saves
- **THEN** the item shows "Milch" without a note

#### Scenario: Separator in the text field
- **WHEN** a user changes the text field of "Joghurt" to "Joghurt, laktosefrei" and saves
- **THEN** the item's text is "Joghurt, laktosefrei" and its note is unchanged

#### Scenario: Empty text field with a changed note
- **WHEN** a user clears the text field of "Milch", enters "2x" in the note field and saves
- **THEN** the item shows "Milch · 2x"

#### Scenario: Saving without changes
- **WHEN** user B opens the edit mode of "Milch · 2x", which user A added, and saves without changing anything
- **THEN** the item is unchanged and A is still shown as last editor

#### Scenario: Editing the note of a checked-off item
- **WHEN** a user changes the note of the checked-off item "Brot" to "Vollkorn" and saves
- **THEN** "Brot · Vollkorn" is shown as checked off

## MODIFIED Requirements

### Requirement: Only the checked state, the text, the note and the claim can be changed
Through the API, users SHALL only be able to change an item's checked state, its text, its note and whether it is claimed by themselves. Author metadata, the claimant, and the times it was checked off and claimed SHALL NOT be set by users.

#### Scenario: Changing the text through the API
- **WHEN** an authenticated user sends an update that changes an item's text to "Kuchen"
- **THEN** the item's text is "Kuchen"

#### Scenario: Changing the note through the API
- **WHEN** an authenticated user sends an update that changes only the note of the item "Milch" to "2x"
- **THEN** the item's note is "2x" and its text is still "Milch"

#### Scenario: Forging the creator on update
- **WHEN** user B updates an item that user A created and sends user B as creator
- **THEN** the stored item still has user A as creator

#### Scenario: Claiming on create
- **WHEN** user A creates an item through the API and sends a claimant
- **THEN** the new item is not claimed

### Requirement: Editing in the row
Each row SHALL have a "more" button that opens the row's edit mode in place: the row expands to show the item's text and its note in two editable fields and buttons to delete, cancel and save. Pressing Enter in either field SHALL save; Escape SHALL cancel, also while no element has focus. Only one row SHALL be in edit mode at a time. The text field SHALL receive focus at once with the cursor at the end of the text, so the user can type right away; on phones the keyboard opens with it.

#### Scenario: Opening the edit mode
- **WHEN** a user taps the more button of "Milch · 2x"
- **THEN** the row of "Milch" expands in place with "Milch" in an editable text field, "2x" in an editable note field and buttons to delete, cancel and save

#### Scenario: Empty note field
- **WHEN** a user opens the edit mode of "Brot", which has no note
- **THEN** the note field is empty and shows "Menge oder Hinweis"

#### Scenario: Keyboard
- **WHEN** a desktop user opens the edit mode of "Milch", changes the text and presses Enter
- **THEN** the new text is saved and the row closes

#### Scenario: Enter in the note field
- **WHEN** a desktop user opens the edit mode of "Milch", types "2x" in the note field and presses Enter
- **THEN** the note is saved and the row closes

#### Scenario: Escape after the field lost focus
- **WHEN** a desktop user changes the text in the edit mode of "Milch", the field loses focus so that no element has focus, and the user presses Escape
- **THEN** the row closes, "Milch" keeps its text, and the more button of "Milch" has focus

#### Scenario: Escape in the add field
- **WHEN** a user has the edit mode of "Milch" open, types in the add field and presses Escape there
- **THEN** the edit mode of "Milch" stays open with its typed text

#### Scenario: Typing right away on a phone
- **WHEN** a phone user taps the more button of "Milch"
- **THEN** the text field has focus with the cursor after "Milch" and the keyboard opens

#### Scenario: Field stays visible above the phone keyboard
- **WHEN** a phone user opens the edit mode of a row near the bottom of the screen
- **THEN** the row is scrolled into view above the keyboard

#### Scenario: Opening another row
- **WHEN** a user has the edit mode of "Milch" open and taps the more button of "Brot"
- **THEN** "Milch" closes without changes and "Brot" opens in edit mode

### Requirement: Editing survives changes by others
While a row is in edit mode, changes to the list by other users SHALL NOT discard what was typed in the text and note fields and SHALL NOT move the row. When the edited item is deleted by someone else, the edit mode SHALL close without changes.

#### Scenario: Someone adds an item while editing
- **WHEN** user A is typing in the edit mode of "Milch" and user B adds "Eier"
- **THEN** A's typed text and cursor stay in the field

#### Scenario: Someone adds an item while typing a note
- **WHEN** user A has changed the text of "Milch" and is typing in its note field, and user B adds "Eier"
- **THEN** A's changed text stays in the text field, and the typed note and the cursor stay in the note field

#### Scenario: Someone checks off the item being edited
- **WHEN** user A has the edit mode of "Milch" open and user B checks off "Milch"
- **THEN** A's row stays in place in edit mode until A saves or cancels

#### Scenario: Item deleted by someone else while editing
- **WHEN** user A has the edit mode of "Milch" open and user B deletes "Milch"
- **THEN** A's edit mode closes without changes

### Requirement: Checking off draws a strike-through
When the user checks off an item, a line SHALL be drawn across its text and note from start to end, like crossing an item off a paper list, and both SHALL turn to the muted color. The line SHALL run on across line breaks. Un-checking SHALL remove the line at once. When the user prefers reduced motion, the line SHALL appear without being drawn.

#### Scenario: Checking off
- **WHEN** a user checks off "Milch"
- **THEN** a line is drawn across "Milch" within a fraction of a second and stays while the row is held in place

#### Scenario: Checking off an item with a note
- **WHEN** a user checks off "Milch · 2x"
- **THEN** one line is drawn across "Milch" and then across "· 2x", and stays while the row is held in place

#### Scenario: Reduced motion
- **WHEN** the user prefers reduced motion and checks off "Milch"
- **THEN** "Milch" is shown struck through at once

### Requirement: Adding an item already on the list
When a user adds an entry whose text equals an open item's text, ignoring upper and lower case and extra spaces, the app SHALL add nothing, whatever note either has. It SHALL clear the add field, keep the focus in it, scroll the existing row into view, highlight that row for about 2 seconds and show "„<text>“ steht schon drauf." in the status bar, with the text as the existing item shows it. Checked-off items SHALL NOT count as open.

#### Scenario: Typing an open item's text
- **WHEN** "Milch" is an open item and the user enters "milch " and confirms
- **THEN** no item is added, the add field is empty and keeps the focus, the row "Milch" is highlighted and the status bar says "„Milch“ steht schon drauf."

#### Scenario: Typing an open item's text with a note
- **WHEN** "Milch" is an open item without a note and the user enters "Milch, 2x" and confirms
- **THEN** no item is added, the add field is empty, the row "Milch" is highlighted and still has no note

#### Scenario: Open item with a note
- **WHEN** "Milch · 2x" is an open item and the user enters "milch" and confirms
- **THEN** no item is added and the row "Milch · 2x" is highlighted

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
When a user saves an open item with a text that equals another open item's text, ignoring case and extra spaces, the app SHALL save nothing, neither text nor note; notes SHALL NOT be compared. The row SHALL stay in edit mode with the typed text and note and the focus, and the other row SHALL be highlighted and announced as when adding. Checked-off items SHALL neither be checked nor count as open.

#### Scenario: Editing into an open item's text
- **WHEN** "Milch" and "Brot" are open items and the user edits "Brot" to "MILCH" and saves
- **THEN** "Brot" is unchanged and still in edit mode with "MILCH", the row "Milch" is highlighted and the status bar says "„Milch“ steht schon drauf."

#### Scenario: Editing into an open item's text with another note
- **WHEN** "Milch · 2x" and "Brot" are open items and the user edits "Brot" to the text "Milch" and the note "1x" and saves
- **THEN** "Brot" is unchanged and still in edit mode with "Milch" and "1x", and the row "Milch · 2x" is highlighted

#### Scenario: Changing only the note
- **WHEN** "Milch" is an open item and the user adds the note "2x" to it and saves
- **THEN** the item is saved as "Milch · 2x"

#### Scenario: Changing only the case of the item itself
- **WHEN** "milch" is an open item and the user edits it to "Milch" and saves
- **THEN** the item is saved as "Milch"

#### Scenario: Editing into a checked-off item's text
- **WHEN** "Brot" was checked off, "Brötchen" is open and the user edits "Brötchen" to "Brot" and saves
- **THEN** the open item is saved as "Brot"

#### Scenario: Editing a checked-off item into an open item's text
- **WHEN** "Milch" is open, "Milch 2x" was checked off and the user edits "Milch 2x" to "Milch" and saves
- **THEN** the checked-off item is saved as "Milch"

## RENAMED Requirements

- FROM: `### Requirement: Only the checked state, the text and the claim can be changed`
- TO: `### Requirement: Only the checked state, the text, the note and the claim can be changed`
