# Spec Delta

## MODIFIED Requirements

### Requirement: Editing in the row
Each row SHALL have a "more" button that opens the row's edit mode in place: the row expands to show the item's text in an editable field and buttons to delete, cancel and save. Pressing Enter in the field SHALL save; Escape SHALL cancel, also while no element has focus. Only one row SHALL be in edit mode at a time. The field SHALL receive focus at once with the cursor at the end of the text, so the user can type right away; on phones the keyboard opens with it.

#### Scenario: Opening the edit mode
- **WHEN** a user taps the more button of "Milch"
- **THEN** the row of "Milch" expands in place with "Milch" in an editable text field and buttons to delete, cancel and save

#### Scenario: Keyboard
- **WHEN** a desktop user opens the edit mode of "Milch", changes the text and presses Enter
- **THEN** the new text is saved and the row closes

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
