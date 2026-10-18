# Spec Delta

## ADDED Requirements

### Requirement: Add, edit and check off items offline
While offline, a user SHALL be able to add items, edit their text, check off items and un-check items. These changes SHALL be shown immediately and marked as not yet synchronized.

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

#### Scenario: Pending changes survive a restart
- **WHEN** a user makes changes offline and closes and reopens the app while still offline
- **THEN** the changes are still shown and still marked as not yet synchronized

### Requirement: The change that reaches the server last wins
When the same item was changed on several devices, the server SHALL keep the change it received last, also when that change was made earlier offline. There SHALL be no merge and no conflict prompt.

#### Scenario: Offline edit synchronized after an online edit
- **WHEN** user A changes "Milch" to "Hafermilch" offline, user B then changes it to "Milch 2x" online, and A reconnects afterwards
- **THEN** every user sees "Hafermilch"

#### Scenario: Edit and check-off on different devices
- **WHEN** user A changes "Milch" to "Hafermilch" offline while user B checks off "Milch" online, and A reconnects
- **THEN** every user sees "Hafermilch" checked off

## REMOVED Requirements

### Requirement: Add and check off items offline
**Reason**: Editing an item's text now also works offline.
**Migration**: Replaced by "Add, edit and check off items offline", which keeps all previous scenarios.
