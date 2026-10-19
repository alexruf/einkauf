# user-auth Specification

## Purpose

Gives every family member a personal account and ensures that the app, its data and its live updates are only available to authenticated users.

## Requirements

### Requirement: Personal accounts created by the administrator
Each family member SHALL have a personal account identified by email and password, with a display name. Accounts SHALL only be created by the administrator; the app SHALL NOT offer self-registration.

#### Scenario: Self-registration is refused
- **WHEN** an unauthenticated client tries to create a user account through the API
- **THEN** the request is refused and no account is created

#### Scenario: A user cannot create further accounts
- **WHEN** an authenticated user tries to create another user account through the API
- **THEN** the request is refused and no account is created

#### Scenario: A user cannot delete their account
- **WHEN** an authenticated user tries to delete their own account through the API
- **THEN** the request is refused and the account still exists

### Requirement: Login with email and password
The app SHALL let a user log in with email and password and SHALL keep the session on the device until the user logs out or the session expires.

#### Scenario: Successful login
- **WHEN** a user enters a valid email and password on the login screen
- **THEN** the app shows the shopping list

#### Scenario: Wrong password
- **WHEN** a user enters a wrong password
- **THEN** the app stays on the login screen and shows a German error message that does not reveal whether the email exists

#### Scenario: Returning to the app
- **WHEN** a logged-in user closes and reopens the app before the session expires
- **THEN** the app shows the shopping list without asking for credentials

### Requirement: Every feature requires authentication
Every app feature, all list data and all live updates SHALL require an authenticated user. Unauthenticated clients SHALL see only the login screen.

#### Scenario: Opening the app without a session
- **WHEN** a user without a session opens the app
- **THEN** the app shows only the login screen and no list data

#### Scenario: Reading items without authentication
- **WHEN** an unauthenticated client requests the list of items through the API
- **THEN** the response contains no items

#### Scenario: Subscribing to live updates without authentication
- **WHEN** an unauthenticated client subscribes to item changes and another user adds an item
- **THEN** the unauthenticated client receives no event

### Requirement: Display name identifies users in the app
Every account SHALL have a display name chosen by the administrator, for example "Mama" or "Papa". The display name SHALL be required, trimmed and at most 30 characters long. Wherever the app refers to a user, it SHALL show the display name and never the email address.

#### Scenario: Account without display name
- **WHEN** the administrator tries to save an account with an empty display name
- **THEN** the account is not saved

#### Scenario: Display name shown on items
- **WHEN** the user with email `mama@example.com` and display name "Mama" adds an item
- **THEN** every user sees the item with "Mama" as creator and the email address appears nowhere in the app

#### Scenario: Own display name shown
- **WHEN** a user is logged in
- **THEN** the app shows the user's own display name, so that the user can tell which account is active

### Requirement: Family members see each other's display names only
Authenticated users SHALL be able to read the display names of all family members. Email addresses of other users SHALL NOT be exposed.

#### Scenario: Listing family members
- **WHEN** an authenticated user lists the user accounts through the API
- **THEN** the response contains every account's id and display name and no other user's email address

### Requirement: Logout removes local data
Logging out SHALL end the session and remove all list data and pending offline changes from the device.

#### Scenario: Logging out
- **WHEN** a user logs out
- **THEN** the app shows the login screen
- **AND** reloading the app without a connection shows no list data

### Requirement: Login attempts are rate limited
The server SHALL limit the number of login attempts per client within a time window to slow down password guessing.

#### Scenario: Many failed login attempts
- **WHEN** a client sends more login attempts than the configured limit within the time window
- **THEN** further attempts are refused with a "too many requests" response until the window has passed

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

### Requirement: The app sends no emails
The server SHALL NOT send any email, whatever triggers it. Password reset and verification requests SHALL answer as they would without this rule, so that they do not reveal whether an address belongs to an account. An email change request SHALL fail, because the change can only be confirmed by email.

#### Scenario: Login from a new device
- **WHEN** a user who has logged in before logs in from a device not seen before
- **THEN** the login succeeds and no email is sent

#### Scenario: Superuser login from a new device
- **WHEN** a superuser who has logged in before logs in from a device not seen before
- **THEN** the login succeeds and no email is sent

#### Scenario: Password reset or verification requested
- **WHEN** an unauthenticated client requests a password reset or an email verification for a family member's address
- **THEN** the request is answered as accepted and no email is sent

#### Scenario: Email change requested
- **WHEN** a logged-in user requests to change their email address
- **THEN** the request fails and no email is sent
