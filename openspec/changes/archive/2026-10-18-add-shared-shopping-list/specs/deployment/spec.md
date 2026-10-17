# Spec Delta

## MODIFIED Requirements

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
