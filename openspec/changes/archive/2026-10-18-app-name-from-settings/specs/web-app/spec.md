# Spec Delta

## ADDED Requirements

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
