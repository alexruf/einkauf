# Spec Delta

## Purpose

Provides the family's shared shopping list: adding items, checking them off and back on, deleting them, seeing who changed what, and receiving changes from others live.

## ADDED Requirements

### Requirement: One shared list for all family members
All authenticated users SHALL see and change the same list of items.

#### Scenario: Item added by another family member
- **WHEN** user A adds an item
- **THEN** user B sees the item in their list

### Requirement: Add an item
A user SHALL be able to add an item by entering its text. The text SHALL be trimmed, MUST NOT be empty and MUST NOT exceed 200 characters. New items SHALL be unchecked.

#### Scenario: Adding an item
- **WHEN** a user enters "Milch" and confirms
- **THEN** an unchecked item "Milch" appears in the list

#### Scenario: Empty text
- **WHEN** a user confirms an empty or whitespace-only text
- **THEN** no item is created

#### Scenario: Text too long
- **WHEN** a client submits an item with more than 200 characters through the API
- **THEN** the request is refused and no item is created

### Requirement: Check off and un-check an item
A user SHALL be able to check off an open item and un-check a checked-off item. Checked-off items SHALL remain in the list, shown greyed out below the open items.

#### Scenario: Checking off an item
- **WHEN** a user checks off the open item "Milch"
- **THEN** "Milch" is shown greyed out below all open items

#### Scenario: Un-checking an item
- **WHEN** a user un-checks the checked-off item "Milch"
- **THEN** "Milch" is shown again as an open item

#### Scenario: Checking off is not a toggle
- **WHEN** two users check off the same open item at the same time
- **THEN** the item is checked off for both users

### Requirement: Only the checked state can be changed
Through the API, users SHALL only be able to change an item's checked state. The item text and author metadata SHALL NOT be changeable by users.

#### Scenario: Changing the text through the API
- **WHEN** an authenticated user sends an update that changes an item's text
- **THEN** the request is refused and the text stays unchanged

### Requirement: Author metadata recorded by the server
For each item the server SHALL record which user created it and which user changed it last, taken from the authenticated request. The list SHALL show both names on each item. Values sent by the client SHALL be ignored.

#### Scenario: Showing who added an item
- **WHEN** user A adds "Brot"
- **THEN** every user sees "Brot" with A's display name as creator and as last editor

#### Scenario: Showing who changed an item last
- **WHEN** user B checks off "Brot", which user A added
- **THEN** "Brot" shows A as creator and B as last editor

#### Scenario: Forged author
- **WHEN** user A creates an item through the API and sends user B as creator and last editor
- **THEN** the stored item has user A as creator and as last editor

#### Scenario: Creator account removed
- **WHEN** the administrator deletes the account of an item's creator
- **THEN** the item remains and shows "Unbekannt" instead of the creator's name

### Requirement: Delete an item
A user SHALL be able to permanently delete any item while online. Before deleting an unchecked item, the app SHALL ask for confirmation. Checked-off items SHALL be deleted without confirmation.

#### Scenario: Deleting a checked-off item
- **WHEN** a user deletes the checked-off item "Milch"
- **THEN** "Milch" disappears from the list of every user

#### Scenario: Deleting an open item
- **WHEN** a user deletes the open item "Brot"
- **THEN** the app asks for confirmation before deleting
- **AND** "Brot" stays in the list if the user cancels

#### Scenario: Deleting while offline
- **WHEN** the device has no connection to the server
- **THEN** the app does not offer to delete items

### Requirement: Live updates
Changes made by one user SHALL appear on the screens of all other logged-in users without a manual reload while they are online.

#### Scenario: Live update on another device
- **WHEN** user A adds, checks off, un-checks or deletes an item while user B has the app open and online
- **THEN** user B's list reflects the change within a few seconds without reloading

### Requirement: Automatic cleanup of checked-off items
The server SHALL permanently delete items that have been checked off for more than 24 hours. Un-checking an item SHALL reset this period.

#### Scenario: Old checked-off item
- **WHEN** an item has been checked off for more than 24 hours and the cleanup runs
- **THEN** the item is deleted

#### Scenario: Recently checked-off item
- **WHEN** an item has been checked off for less than 24 hours and the cleanup runs
- **THEN** the item remains

#### Scenario: Open item
- **WHEN** an item was created more than 24 hours ago and is not checked off when the cleanup runs
- **THEN** the item remains
