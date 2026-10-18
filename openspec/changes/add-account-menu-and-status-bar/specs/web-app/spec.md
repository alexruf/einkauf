# Spec Delta

## ADDED Requirements

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
