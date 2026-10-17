# deployment Specification

## Purpose

Defines how the app runs in production on the VPS: served over HTTPS behind the existing reverse proxy, with persistent data, pinned versions and schema changes applied only from committed migrations.

## Requirements

### Requirement: Self-contained deployment unit
The repository SHALL contain everything needed to run the app in production, except secrets, so that a clone of the repository plus a `.env` file is a complete deployment.

#### Scenario: First deployment
- **WHEN** an operator clones the repository on the VPS, creates `.env` from `.env.example` and starts the stack
- **THEN** the app starts and its health endpoint `/api/health` reports healthy

#### Scenario: Updating a deployment
- **WHEN** an operator pulls new commits in the clone and restarts the stack
- **THEN** the app runs the newly committed frontend, hooks and migrations

### Requirement: Served over HTTPS via the existing reverse proxy
The app SHALL be reachable over HTTPS at its configured hostname through the VPS's existing reverse proxy, using routing names unique to this app.

#### Scenario: Visiting the app
- **WHEN** a user opens `https://<configured-hostname>/`
- **THEN** the app's start page is served with a valid TLS certificate

#### Scenario: Coexisting with other apps
- **WHEN** another app on the same reverse proxy uses its own routing names
- **THEN** both apps remain reachable at their own hostnames

### Requirement: Pinned backend version
Production SHALL run an explicitly pinned backend version, never a floating tag such as `latest`.

#### Scenario: Inspecting the production configuration
- **WHEN** the production configuration is inspected
- **THEN** the backend image reference contains an exact version that matches the development environment

### Requirement: Persistent data
Application data SHALL survive container restarts and image updates.

#### Scenario: Restarting after an update
- **WHEN** data has been created and the stack is recreated with a new image version
- **THEN** the previously created data is still present

### Requirement: Schema changes only via committed migrations
Production SHALL apply committed migrations on startup and SHALL NOT generate new migration files when the schema is changed in its admin UI.

#### Scenario: Startup with a new migration
- **WHEN** the stack starts with a migration that has not yet been applied
- **THEN** the migration is applied before the app serves requests

#### Scenario: Schema edited in the production admin UI
- **WHEN** an administrator changes a collection in the production admin UI
- **THEN** no new file appears in the migrations directory

### Requirement: Secrets provided outside version control
The settings encryption key SHALL be provided through an untracked `.env` file, and the repository SHALL document every required variable in `.env.example`. The superuser SHALL be created once with a documented command and SHALL NOT be recreated on every start, because the image's automatic superuser setup cannot read encrypted settings.

#### Scenario: Missing environment file
- **WHEN** an operator inspects `.env.example`
- **THEN** it lists every variable the production configuration references, without real values

#### Scenario: Settings are encrypted at rest
- **WHEN** the app runs in production with the encryption key set
- **THEN** the app settings stored in the database are encrypted with that key

#### Scenario: Restarting with encrypted settings
- **WHEN** the settings are stored encrypted and the stack is restarted
- **THEN** the app starts and its health endpoint reports healthy

#### Scenario: Creating the first superuser
- **WHEN** an operator runs the documented superuser command on a new deployment
- **THEN** a superuser exists and can log in to the admin UI
