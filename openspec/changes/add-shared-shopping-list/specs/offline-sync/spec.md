# Spec Delta

## Purpose

Keeps the shopping list usable without a network connection, as is common inside shops, and synchronizes changes made offline once the connection returns.

## ADDED Requirements

### Requirement: App opens without a connection
A logged-in user SHALL be able to open the app without a connection and see the list as it was last received from the server.

#### Scenario: Opening the app offline
- **WHEN** a logged-in user who has opened the list online before opens the app without a connection
- **THEN** the app shows the last known list

#### Scenario: Offline indicator
- **WHEN** the app has no connection to the server
- **THEN** the app shows a visible German hint that it is offline

### Requirement: Add and check off items offline
While offline, a user SHALL be able to add items, check off items and un-check items. These changes SHALL be shown immediately and marked as not yet synchronized.

#### Scenario: Changes made offline
- **WHEN** a user adds "Eier" and checks off "Milch" while offline
- **THEN** "Eier" appears as an open item and "Milch" as checked off
- **AND** both are marked as not yet synchronized

#### Scenario: Pending changes survive a restart
- **WHEN** a user makes changes offline and closes and reopens the app while still offline
- **THEN** the changes are still shown and still marked as not yet synchronized

### Requirement: Synchronize after reconnecting
When the connection returns, the app SHALL send all pending changes to the server in the order they were made, then reload the list from the server, so that changes made by others in the meantime become visible.

#### Scenario: Reconnecting
- **WHEN** a user added "Eier" and checked off "Milch" offline, and the connection returns while the app is open
- **THEN** other users see "Eier" and "Milch" checked off, with this user as last editor
- **AND** the "not yet synchronized" marks disappear

#### Scenario: Changes by others while offline
- **WHEN** user B adds "Butter" while user A is offline, and A's connection returns
- **THEN** A's list shows "Butter" without a manual reload

### Requirement: Repeated delivery has no side effects
Sending the same pending change more than once, for example after an interrupted connection, SHALL NOT create duplicate items or flip an item's checked state.

#### Scenario: Interrupted synchronization
- **WHEN** a pending "add Eier" change reaches the server but the confirmation is lost, and the app sends it again
- **THEN** the list contains "Eier" exactly once

### Requirement: Changes to deleted items are discarded
A pending change to an item that another user deleted in the meantime SHALL be discarded during synchronization without blocking the remaining changes.

#### Scenario: Item deleted while offline
- **WHEN** user A checks off "Milch" offline and user B deletes "Milch" before A reconnects
- **THEN** after A reconnects, "Milch" is not in anyone's list
- **AND** A's other pending changes are synchronized

### Requirement: Pending changes survive an expired session
If the session expired while offline, pending changes SHALL be kept until the same user logs in again and SHALL then be synchronized.

#### Scenario: Session expired during offline use
- **WHEN** a user's session expires while they have pending changes and they log in again with the same account
- **THEN** the pending changes are synchronized

#### Scenario: Different account logs in
- **WHEN** pending changes exist from user A and user B logs in on the same device
- **THEN** A's pending changes are discarded and are not sent as B's changes
