# Spec Delta

## MODIFIED Requirements

### Requirement: Connection state is always visible
While a user is logged in, a status bar at the bottom of the screen SHALL show the connection to the server as an indicator: a colored dot with a short German text. It SHALL complement, not replace, the offline notice at the top. While the app is connected and has no pending changes, the connection indicator SHALL be hidden, because the sync indicator "Synchronisiert" already implies the connection.

#### Scenario: Connecting
- **WHEN** a logged-in user opens the app and the connection to the server is not established yet
- **THEN** the connection indicator shows "Verbinde …" with a yellow dot

#### Scenario: Connected
- **WHEN** the app is connected to the server and changes have not been confirmed by the server yet
- **THEN** the connection indicator shows "Verbunden" with a green dot

#### Scenario: Connected and fully synchronized
- **WHEN** the app is connected to the server and has no pending changes
- **THEN** the connection indicator is hidden
- **AND** the status bar shows only the sync indicator "Synchronisiert" with a green dot

#### Scenario: Offline
- **WHEN** the app has no connection to the server
- **THEN** the connection indicator shows "Offline" with a red dot
- **AND** the offline notice at the top is shown as before
