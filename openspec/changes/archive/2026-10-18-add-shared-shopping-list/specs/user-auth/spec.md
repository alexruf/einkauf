# Spec Delta

## Purpose

Gives every family member a personal account and ensures that the app, its data and its live updates are only available to authenticated users.

## ADDED Requirements

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
