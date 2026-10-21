# Spec Delta

## ADDED Requirements

### Requirement: Fields stand out from their background
Text fields and framed buttons SHALL be drawn in a color that differs from the background of the area they sit on, in light and dark mode, so a field is recognizable as a field even without focus. This applies in particular to the fields and buttons of a row in edit mode, the add field in the header, the fields of the login screen and the buttons of confirmation dialogs. Icon and text buttons without a frame are exempt.

#### Scenario: Note field in edit mode
- **WHEN** a user opens the edit mode of "Milch" and the text field has the focus
- **THEN** the note field's background differs in color from the row's background, in light and dark mode

#### Scenario: Text field after losing focus
- **WHEN** the text field in the edit mode of "Milch" loses the focus
- **THEN** its background differs in color from the row's background

#### Scenario: Edit row stands out from the list
- **WHEN** a user opens the edit mode of "Milch"
- **THEN** the row's background differs in color from the page behind the list

#### Scenario: Add field
- **WHEN** a user opens the list
- **THEN** the add field's background differs from the page color, on which the header is based

#### Scenario: Login fields
- **WHEN** a user without a session opens the app
- **THEN** the email and password fields' backgrounds differ in color from the login card's background, in light and dark mode

#### Scenario: Buttons in a confirmation dialog
- **WHEN** the logout confirmation dialog is open
- **THEN** the backgrounds of "Abbrechen" and "Abmelden" differ in color from the dialog's background, in light and dark mode
