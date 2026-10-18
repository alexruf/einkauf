# web-app Specification

## Purpose

Defines how the frontend reaches the family's devices: an installable web app with a German UI that is comfortable to use on phones and desktop browsers and protected by a strict content security policy.

## Requirements

### Requirement: German user interface
All text shown to users SHALL be German.

#### Scenario: Viewing the app
- **WHEN** a user opens any screen of the app
- **THEN** all labels, hints, dialogs and error messages are German

### Requirement: Usable on phones and desktop browsers
The app SHALL be fully usable on phone screens from 360 px width with touch input and in desktop browsers with mouse and keyboard, without horizontal scrolling.

#### Scenario: Phone
- **WHEN** a user opens the app on a 360 px wide phone screen
- **THEN** all functions are reachable without horizontal scrolling and every tap target is at least 44 by 44 px

#### Scenario: Desktop
- **WHEN** a user opens the app in a desktop browser
- **THEN** the list is shown in a readable centered column
- **AND** a new item can be added with the keyboard alone by typing and pressing Enter

### Requirement: Installable as an app
The app SHALL be installable to the home screen of phones and SHALL then start in its own window without browser controls.

#### Scenario: Installing on a phone
- **WHEN** a user adds the app to the home screen and opens it from there
- **THEN** the app starts in standalone mode with its own name and icon

### Requirement: Login screen explains how to install the app
The login screen SHALL offer a collapsible hint that explains in German how to add the app to the home screen on iPhone/iPad with Safari and on Android with Chrome. The hint SHALL be collapsed by default and SHALL NOT be shown when the app already runs as an installed app.

#### Scenario: Opening the login screen in the browser
- **WHEN** an unauthenticated user opens the app in a phone or desktop browser
- **THEN** the login screen shows a collapsed hint titled "App installieren"
- **AND** the login form is usable without expanding the hint

#### Scenario: Expanding the hint
- **WHEN** the user expands the hint
- **THEN** it shows step-by-step instructions for iPhone/iPad (Safari) and for Android (Chrome)

#### Scenario: Collapsing the hint again
- **WHEN** the user collapses the expanded hint
- **THEN** the instructions are hidden again

#### Scenario: App already installed
- **WHEN** an unauthenticated user opens the app from the home screen in standalone mode
- **THEN** the login screen does not show the install hint

### Requirement: New versions reach users
After a new version has been deployed, a user who opens the app online SHALL receive the new version without having to clear caches.

#### Scenario: Opening the app after a deployment
- **WHEN** a new frontend version has been deployed and a user opens the app online
- **THEN** the new version is loaded at the latest on the next start of the app

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

### Requirement: Strict content security policy
The app SHALL only execute scripts and load resources from its own origin and SHALL NOT render user-entered text as HTML.

#### Scenario: Item text containing markup
- **WHEN** a user adds an item with the text `<img src=x onerror=alert(1)>`
- **THEN** every user sees exactly that text and no script runs

### Requirement: App name follows the server setting
The app SHALL show the application name configured in the backend's settings in its header and as the browser title. The name SHALL be readable without logging in, and reading it SHALL NOT expose any other setting.

#### Scenario: Name changed by an admin
- **WHEN** an admin changes the application name to "Familieneinkauf" and a user then opens the app online
- **THEN** the header and the browser title show "Familieneinkauf"

#### Scenario: Login screen
- **WHEN** an unauthenticated user opens the app online
- **THEN** the login screen shows the configured application name

#### Scenario: Reading the name without login
- **WHEN** a client without authentication requests the application name
- **THEN** it receives only the name and no other setting values

### Requirement: App name is available offline
The app SHALL remember the last application name it received and SHALL show it when the server cannot be reached. If it has never received a name, it SHALL show "Einkauf".

#### Scenario: Offline after a previous visit
- **WHEN** a user who previously loaded the name "Familieneinkauf" opens the app offline
- **THEN** the header and the browser title show "Familieneinkauf"

#### Scenario: First start without a connection
- **WHEN** a user opens the app for the first time and the name cannot be loaded
- **THEN** the header and the browser title show "Einkauf"

### Requirement: Default application name is "Einkauf"
A new installation SHALL have "Einkauf" as its application name. An installation whose application name an admin has already changed SHALL keep that name.

#### Scenario: Fresh installation
- **WHEN** the app is started for the first time on an empty data directory
- **THEN** the application name in the backend settings is "Einkauf"

#### Scenario: Existing custom name
- **WHEN** an installation whose application name is "Familieneinkauf" is updated to this version
- **THEN** the application name is still "Familieneinkauf"

### Requirement: App version is visible
The app SHALL show the version of the frontend it is running in the status bar at the bottom of the screen, on the login screen and on the list. The shown version SHALL be the one of the code actually running on the device, also when it was loaded from the offline cache.

#### Scenario: Logged-in user
- **WHEN** a logged-in user views the list
- **THEN** the status bar shows the app version, for example "2026.10.18.0"

#### Scenario: Login screen
- **WHEN** an unauthenticated user views the login screen
- **THEN** the status bar shows the app version

#### Scenario: Offline
- **WHEN** a user opens the app without a connection
- **THEN** the status bar shows the version of the cached app

### Requirement: Version follows calendar versioning
The app version SHALL have the form `YYYY.0M.0D.MICRO`: the release date with four-digit year and two-digit month and day, followed by a counter that starts at 0 for the first release of a day and increases by one for each further release on the same day.

#### Scenario: First release of a day
- **WHEN** the first release on 18 October 2026 is made
- **THEN** its version is "2026.10.18.0"

#### Scenario: Second release on the same day
- **WHEN** a second release is made on 18 October 2026
- **THEN** its version is "2026.10.18.1"

#### Scenario: Single-digit month and day
- **WHEN** the first release on 5 March 2027 is made
- **THEN** its version is "2027.03.05.0"
