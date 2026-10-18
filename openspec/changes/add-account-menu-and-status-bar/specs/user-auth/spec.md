# Spec Delta

## ADDED Requirements

### Requirement: Logout is offered in the account menu
The header SHALL show the logged-in user's display name as the trigger of an account menu. The logout action SHALL be offered only inside that menu, not directly in the header.

#### Scenario: Opening the account menu
- **WHEN** a logged-in user activates their display name in the header
- **THEN** a menu opens that says "Angemeldet als" with the user's display name and contains "Abmelden"
- **AND** the rest of the screen is dimmed while the menu is open

#### Scenario: Closing the menu without choosing
- **WHEN** the account menu is open and the user taps outside it or presses Escape
- **THEN** the menu closes and the user stays logged in

#### Scenario: Header without open menu
- **WHEN** a logged-in user views the list
- **THEN** the header shows the user's display name and no "Abmelden" button

### Requirement: Logout asks for confirmation
Choosing "Abmelden" SHALL open a German confirmation dialog. The user SHALL only be logged out after confirming; cancelling SHALL keep the session and all data on the device unchanged.

#### Scenario: Confirming logout
- **WHEN** a user chooses "Abmelden" in the account menu and confirms the dialog
- **THEN** the app shows the login screen and the list data is removed from the device

#### Scenario: Cancelling logout
- **WHEN** a user chooses "Abmelden" in the account menu and cancels the dialog
- **THEN** the user stays logged in and the list is shown unchanged

### Requirement: Logout confirmation warns about pending changes
When changes made on the device have not reached the server yet, the logout confirmation SHALL state how many changes will be lost.

#### Scenario: No pending changes
- **WHEN** a user without pending changes chooses "Abmelden"
- **THEN** the dialog asks "Wirklich abmelden?"

#### Scenario: Several pending changes
- **WHEN** a user with 2 pending changes chooses "Abmelden"
- **THEN** the dialog says that 2 changes have not been sent yet and will be lost when logging out

#### Scenario: One pending change
- **WHEN** a user with 1 pending change chooses "Abmelden"
- **THEN** the dialog uses the singular form, saying that 1 change has not been sent yet and will be lost
