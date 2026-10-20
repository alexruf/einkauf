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

### Requirement: Consistent design in light and dark mode
All screens, including the login screen, header, account menu, list, dialogs and status bar, SHALL share one visual design and follow the device's light or dark mode. Controls SHALL look the same on every platform: checkboxes in particular SHALL NOT use the platform's native look and SHALL NOT appear darker than the background in dark mode.

#### Scenario: Dark mode
- **WHEN** a user opens the app on a phone set to dark mode
- **THEN** every screen is shown in dark colors
- **AND** unchecked checkboxes are drawn as an outline on the row's background, not as a dark filled square

#### Scenario: Checked checkbox
- **WHEN** an item is checked off
- **THEN** its checkbox is filled with the accent color and shows a check mark, in light and dark mode

### Requirement: Legible text
All text SHALL meet WCAG AA contrast against its background in light and dark mode: at least 4.5:1 for normal text and 3:1 for text of 24 px and larger. Item text SHALL be at least 17 px. The app SHALL use a font that tells I, l and 1 and O and 0 clearly apart, shipped with the app so it also works offline.

#### Scenario: Contrast of secondary text
- **WHEN** the meta line of an item is shown in light or dark mode
- **THEN** its contrast against the row background is at least 4.5:1

#### Scenario: Font offline
- **WHEN** the installed app is opened without a connection
- **THEN** item text is shown in the app's own font, not a fallback

### Requirement: Every action works without gestures and hover
Every action SHALL be reachable through a visible button that can be used by tap, by mouse and by keyboard. Gestures MAY be added only as shortcuts for such a button. No control SHALL appear only while the mouse hovers over it.

#### Scenario: Keyboard only
- **WHEN** a desktop user uses only the keyboard
- **THEN** they can add an item, check it off, claim it, edit it, delete it and expand the "Erledigt" section

#### Scenario: Touch only
- **WHEN** a phone user uses only taps
- **THEN** every action of the app is reachable without swiping or long-pressing

### Requirement: Dialogs suit one-handed use
On phone-sized screens, dialogs SHALL open at the bottom of the screen, within reach of the thumb. Text input SHALL NOT happen in dialogs anchored to the bottom, because the phone keyboard would cover them; editing happens in the list instead. On wider screens they SHALL open centered. Every dialog SHALL close with Escape and with its cancel button.

#### Scenario: Phone
- **WHEN** a user asks to log out on a 390 px wide phone screen
- **THEN** the confirmation is anchored to the bottom of the screen

#### Scenario: Desktop
- **WHEN** a user asks to log out in a desktop browser
- **THEN** the confirmation is centered on the screen and closes on Escape

### Requirement: Compact add button
The button that adds an item SHALL be an icon button showing "+", with "Hinzufügen" as its accessible name, so the text field gets most of the row's width. The add field SHALL stay at the top of the list.

#### Scenario: Adding with the button
- **WHEN** a user enters "Milch" and taps the "+" button
- **THEN** "Milch" is added to the list

#### Scenario: Accessible name
- **WHEN** a screen reader user focuses the "+" button
- **THEN** it is announced as "Hinzufügen"

### Requirement: Header stays in view while the list scrolls
On the list screen, the header with the app name and the account button and the add field SHALL stay together at the top of the screen while the list scrolls beneath them, like the status bar stays at the bottom. They SHALL stay clear of the system status bar on devices with a notch. A row that the app or the browser scrolls into view SHALL end up fully visible below them, not hidden beneath them.

#### Scenario: Scrolling a long list
- **WHEN** a logged-in user scrolls down a list that is longer than the screen
- **THEN** the app name, the account button and the add field stay visible at the top of the screen
- **AND** the rows pass beneath them

#### Scenario: Header at the top of the list
- **WHEN** a logged-in user opens the list without scrolling
- **THEN** the header and the add field are shown above the first row as before

#### Scenario: Phone with a notch
- **WHEN** the installed app runs on a phone with a notch and the list is scrolled
- **THEN** the app name, the account button and the add field are not covered by the system status bar

#### Scenario: Duplicate scrolled out of view
- **WHEN** the open item "Milch" is scrolled out of view and the user adds "Milch"
- **THEN** the row "Milch" is scrolled into view completely below the add field

#### Scenario: Editing a row while scrolled
- **WHEN** the list is scrolled and the user opens the edit mode of a row near the top of the screen
- **THEN** the row's fields are fully visible below the add field

### Requirement: Compact status bar
The status bar at the bottom of the screen SHALL take no more height than its content needs, so the list keeps as much room as possible. Because it holds no controls, on devices with a home indicator its content MAY reach into the area reserved at the bottom of the screen, but SHALL stay clear of the home indicator itself.

#### Scenario: Phone without a home indicator
- **WHEN** a logged-in user views the list on a 360 px wide phone
- **THEN** the status bar is at most 36 px high

#### Scenario: Phone with a home indicator
- **WHEN** the installed app runs on a phone with a home indicator
- **THEN** the space below the status bar's text is smaller than the reserved area at the bottom of the screen
- **AND** the text does not touch the home indicator

#### Scenario: Rows sliding past the status bar
- **WHEN** rows slide to a new place near the bottom of the screen
- **THEN** they pass beneath the status bar, not over it
