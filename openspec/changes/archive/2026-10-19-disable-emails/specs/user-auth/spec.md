# Spec Delta

## ADDED Requirements

### Requirement: The app sends no emails
The server SHALL NOT send any email, whatever triggers it. Password reset and verification requests SHALL answer as they would without this rule, so that they do not reveal whether an address belongs to an account. An email change request SHALL fail, because the change can only be confirmed by email.

#### Scenario: Login from a new device
- **WHEN** a user who has logged in before logs in from a device not seen before
- **THEN** the login succeeds and no email is sent

#### Scenario: Superuser login from a new device
- **WHEN** a superuser who has logged in before logs in from a device not seen before
- **THEN** the login succeeds and no email is sent

#### Scenario: Password reset or verification requested
- **WHEN** an unauthenticated client requests a password reset or an email verification for a family member's address
- **THEN** the request is answered as accepted and no email is sent

#### Scenario: Email change requested
- **WHEN** a logged-in user requests to change their email address
- **THEN** the request fails and no email is sent
