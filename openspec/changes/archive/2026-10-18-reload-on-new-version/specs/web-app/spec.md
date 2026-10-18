# Spec Delta

## ADDED Requirements

### Requirement: Running app picks up a new deployment
A logged-in app that is already running SHALL check the deployed version each time its realtime connection is established or re-established, and SHALL reload itself when the deployed version differs from the version it runs. A check that fails or gets no answer SHALL leave the app as it is.

#### Scenario: Deployment while the app is open
- **WHEN** a new version is deployed while a logged-in user has the app open and idle
- **THEN** after the app has reconnected, it reloads and the status bar shows the new version

#### Scenario: Returning from the background
- **WHEN** a new version was deployed while the app was in the background and the user brings it back
- **THEN** after the app has reconnected, it reloads and the status bar shows the new version

#### Scenario: Same version
- **WHEN** the app reconnects and the deployed version equals the running version
- **THEN** the app does not reload

#### Scenario: Check fails
- **WHEN** the app reconnects but the deployed version cannot be loaded
- **THEN** the app does not reload and keeps working with the running version

#### Scenario: Unsent changes survive the reload
- **WHEN** the app reloads for a new version while changes are still waiting to be sent
- **THEN** the changes are still pending after the reload and are sent as usual

### Requirement: Reload waits for an entry in progress
The app SHALL NOT reload for a new version while the input field for new items contains text or a dialog is open. It SHALL reload once the item has been added or the dialog has been closed, provided no other entry is then in progress.

#### Scenario: Typing a new item
- **WHEN** a new version is detected while the input field for new items contains text
- **THEN** the app does not reload and the text stays in the field
- **AND** after the user adds the item, the app reloads, shows the new version and the item is on the list

#### Scenario: Dialog open
- **WHEN** a new version is detected while the edit dialog is open
- **THEN** the app does not reload while the dialog stays open
- **AND** after the dialog is closed, the app reloads

### Requirement: No reload loop
The app SHALL reload at most once per deployed version within the same browser tab or app window, so that a reload which still yields the old code does not repeat.

#### Scenario: Reload yields the old code
- **WHEN** the app has reloaded for version "2026.10.19.0" but still runs the previous version and reconnects again
- **THEN** it does not reload again for "2026.10.19.0"

#### Scenario: Another version follows
- **WHEN** the app has already reloaded once for "2026.10.19.0" and later "2026.10.19.1" is deployed
- **THEN** the app reloads for "2026.10.19.1"
