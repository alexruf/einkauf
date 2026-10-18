# offline-sync Specification

## Purpose

Keeps the shopping list usable without a network connection, as is common inside shops, and synchronizes changes made offline once the connection returns.

## Requirements

### Requirement: App opens without a connection
A logged-in user SHALL be able to open the app without a connection and see the list as it was last received from the server.

#### Scenario: Opening the app offline
- **WHEN** a logged-in user who has opened the list online before opens the app without a connection
- **THEN** the app shows the last known list

#### Scenario: Offline indicator
- **WHEN** the app has no connection to the server
- **THEN** the app shows a visible German hint that it is offline

### Requirement: Add, edit and check off items offline
While offline, a user SHALL be able to add items, edit their text, check off items and un-check items. These changes SHALL be shown immediately and marked as not yet synchronized.

#### Scenario: Changes made offline
- **WHEN** a user adds "Eier" and checks off "Milch" while offline
- **THEN** "Eier" appears as an open item and "Milch" as checked off
- **AND** both are marked as not yet synchronized

#### Scenario: Editing offline
- **WHEN** a user changes the text of "Milch" to "Hafermilch" while offline
- **THEN** the item shows "Hafermilch" and is marked as not yet synchronized
- **AND** after the connection returns, other users see "Hafermilch"

#### Scenario: Editing an item that is not synchronized yet
- **WHEN** a user adds "Eier" offline and then changes its text to "Eier 10x"
- **THEN** after the connection returns, other users see "Eier 10x" exactly once

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

### Requirement: The change that reaches the server last wins
When the same item was changed on several devices, the server SHALL keep the change it received last, also when that change was made earlier offline. There SHALL be no merge and no conflict prompt.

#### Scenario: Offline edit synchronized after an online edit
- **WHEN** user A changes "Milch" to "Hafermilch" offline, user B then changes it to "Milch 2x" online, and A reconnects afterwards
- **THEN** every user sees "Hafermilch"

#### Scenario: Edit and check-off on different devices
- **WHEN** user A changes "Milch" to "Hafermilch" offline while user B checks off "Milch" online, and A reconnects
- **THEN** every user sees "Hafermilch" checked off

### Requirement: Pending changes survive an expired session
If the session expired while offline, pending changes SHALL be kept until the same user logs in again and SHALL then be synchronized.

#### Scenario: Session expired during offline use
- **WHEN** a user's session expires while they have pending changes and they log in again with the same account
- **THEN** the pending changes are synchronized

#### Scenario: Different account logs in
- **WHEN** pending changes exist from user A and user B logs in on the same device
- **THEN** A's pending changes are discarded and are not sent as B's changes

### Requirement: Connection state is always visible
While a user is logged in, a status bar at the bottom of the screen SHALL show the connection to the server as an indicator: a colored dot with a short German text. It SHALL complement, not replace, the offline notice at the top.

#### Scenario: Connecting
- **WHEN** a logged-in user opens the app and the connection to the server is not established yet
- **THEN** the connection indicator shows "Verbinde …" with a yellow dot

#### Scenario: Connected
- **WHEN** the app is connected to the server
- **THEN** the connection indicator shows "Verbunden" with a green dot

#### Scenario: Offline
- **WHEN** the app has no connection to the server
- **THEN** the connection indicator shows "Offline" with a red dot
- **AND** the offline notice at the top is shown as before

### Requirement: Synchronization state is always visible
While a user is logged in, the status bar SHALL show the synchronization state next to the connection indicator, as a colored dot with a short German text.

#### Scenario: Everything synchronized
- **WHEN** the app is online and has no pending changes
- **THEN** the sync indicator shows "Synchronisiert" with a green dot

#### Scenario: Pending changes while online
- **WHEN** the app is online and 2 changes have not been confirmed by the server yet
- **THEN** the sync indicator shows "Sende 2 Änderungen" with a yellow dot

#### Scenario: One pending change while online
- **WHEN** the app is online and 1 change has not been confirmed by the server yet
- **THEN** the sync indicator shows "Sende 1 Änderung"

### Requirement: Time of the last synchronization is shown while not connected
While the app is not connected, the sync indicator SHALL show when the list was last known to be current, as a local time with "heute", "gestern" or a date, with a two-digit year only when it is not the current year. The dot SHALL be grey, or yellow when changes are pending. The time SHALL survive a restart of the app.

#### Scenario: Offline after a synchronization today
- **WHEN** the list was last synchronized today at 14:32 and the app goes offline
- **THEN** the sync indicator shows "Stand heute, 14:32" with a grey dot

#### Scenario: Offline after a synchronization yesterday
- **WHEN** the list was last synchronized yesterday at 18:05 and the user opens the app offline
- **THEN** the sync indicator shows "Stand gestern, 18:05"

#### Scenario: Older synchronization
- **WHEN** the list was last synchronized on 15 October 2026 at 09:10 and the user opens the app offline on a later day than 16 October
- **THEN** the sync indicator shows "Stand 15.10., 09:10"

#### Scenario: Synchronization in an earlier year
- **WHEN** the list was last synchronized on 30 December 2025 at 17:45 and the user opens the app offline in 2026
- **THEN** the sync indicator shows "Stand 30.12.25, 17:45"

#### Scenario: Offline with pending changes
- **WHEN** the app is offline and a change made on the device has not been sent yet
- **THEN** the sync indicator shows the time of the last synchronization with a yellow dot

#### Scenario: Never synchronized
- **WHEN** a logged-in user has never completed a synchronization on this device and the app is not connected
- **THEN** the sync indicator shows "Noch nicht synchronisiert"

### Requirement: Indicators do not rely on color alone
Every indicator SHALL show its state as text in addition to the dot color. Animations of the dots SHALL be switched off when the user prefers reduced motion.

#### Scenario: Reading the state without color
- **WHEN** a user cannot tell the dot colors apart
- **THEN** the text of each indicator still states the connection and synchronization state
