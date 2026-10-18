# Spec Delta

## ADDED Requirements

### Requirement: Add, edit, check off and claim items offline
While offline, a user SHALL be able to add items, edit their text, check off items, un-check items, claim items and remove claims. These changes SHALL be shown immediately and marked as not yet synchronized. Other users see a claim made offline only after it is synchronized.

#### Scenario: Changes made offline
- **WHEN** a user adds "Eier" and checks off "Milch" while offline
- **THEN** "Eier" appears as an open item and "Milch" as checked off
- **AND** both are marked as not yet synchronized

#### Scenario: Editing offline
- **WHEN** a user changes the text of "Milch" to "Hafermilch" while offline
- **THEN** the item shows "Hafermilch" and is marked as not yet synchronized
- **AND** after the connection returns, other users see "Hafermilch"

#### Scenario: Editing an item that is not synchronized yet
- **WHEN** a user adds "Eier" offline and then changes its text to "Eier 10x"
- **THEN** after the connection returns, other users see "Eier 10x" exactly once

#### Scenario: Claiming offline
- **WHEN** user A claims "Milch" while offline
- **THEN** A sees "Milch" claimed by A and marked as not yet synchronized
- **AND** after the connection returns, other users see "Milch" claimed by A

#### Scenario: Claim and check-off on different devices
- **WHEN** user A claims "Milch" offline while user B checks off "Milch" online, and A reconnects
- **THEN** every user sees "Milch" checked off and not claimed

#### Scenario: Pending changes survive a restart
- **WHEN** a user makes changes offline and closes and reopens the app while still offline
- **THEN** the changes are still shown and still marked as not yet synchronized

## REMOVED Requirements

### Requirement: Add, edit and check off items offline
**Reason**: Claiming items and removing claims now also work offline.
**Migration**: Replaced by "Add, edit, check off and claim items offline", which keeps all previous scenarios.
