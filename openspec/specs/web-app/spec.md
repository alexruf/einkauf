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

### Requirement: Strict content security policy
The app SHALL only execute scripts and load resources from its own origin and SHALL NOT render user-entered text as HTML.

#### Scenario: Item text containing markup
- **WHEN** a user adds an item with the text `<img src=x onerror=alert(1)>`
- **THEN** every user sees exactly that text and no script runs
