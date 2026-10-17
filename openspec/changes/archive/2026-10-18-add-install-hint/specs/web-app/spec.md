## ADDED Requirements

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
