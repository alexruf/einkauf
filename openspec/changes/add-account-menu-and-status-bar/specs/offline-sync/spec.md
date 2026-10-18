# Spec Delta

## ADDED Requirements

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
