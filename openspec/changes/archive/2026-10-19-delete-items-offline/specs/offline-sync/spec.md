# Spec Delta

## ADDED Requirements

### Requirement: Add, edit, check off, claim and delete items offline
While offline, a user SHALL be able to add items, edit their text, check off items, un-check items, claim items, remove claims and delete items. These changes SHALL be shown immediately; all but deletes SHALL be marked as not yet synchronized, while a deleted item disappears from the list at once. Other users see a change made offline only after it is synchronized.

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

#### Scenario: Deleting offline
- **WHEN** user A deletes "Milch" while offline
- **THEN** "Milch" disappears from A's list at once, while user B still sees it
- **AND** after A reconnects, "Milch" is not in anyone's list

#### Scenario: Pending delete counts as an unsent change
- **WHEN** a user deletes an item while offline
- **THEN** the sync indicator shows a pending change
- **AND** the logout question warns that 1 change has not been sent yet

#### Scenario: Pending changes survive a restart
- **WHEN** a user makes changes offline, including a delete, and closes and reopens the app while still offline
- **THEN** the changes are still shown, the deleted item stays hidden, and the other changes are still marked as not yet synchronized

## MODIFIED Requirements

### Requirement: Repeated delivery has no side effects
Sending the same pending change more than once, for example after an interrupted connection, SHALL NOT create duplicate items, flip an item's checked state or report a delete as failed.

#### Scenario: Interrupted synchronization
- **WHEN** a pending "add Eier" change reaches the server but the confirmation is lost, and the app sends it again
- **THEN** the list contains "Eier" exactly once

#### Scenario: Delete of an item that is already gone
- **WHEN** a pending delete of "Milch" is sent but "Milch" no longer exists on the server, because the delete already arrived once or someone else deleted it
- **THEN** the delete counts as done, without a notice, and the remaining changes are synchronized

### Requirement: The change that reaches the server last wins
When the same item was changed on several devices, the server SHALL keep the change it received last, also when that change was made earlier offline. A delete received last SHALL delete the item whatever was changed before. There SHALL be no merge and no conflict prompt.

#### Scenario: Offline edit synchronized after an online edit
- **WHEN** user A changes "Milch" to "Hafermilch" offline, user B then changes it to "Milch 2x" online, and A reconnects afterwards
- **THEN** every user sees "Hafermilch"

#### Scenario: Edit and check-off on different devices
- **WHEN** user A changes "Milch" to "Hafermilch" offline while user B checks off "Milch" online, and A reconnects
- **THEN** every user sees "Hafermilch" checked off

#### Scenario: Offline delete synchronized after an online edit
- **WHEN** user A deletes "Milch" offline, user B then changes it to "Hafermilch" online, and A reconnects afterwards
- **THEN** the item is not in anyone's list

## REMOVED Requirements

### Requirement: Add, edit, check off and claim items offline
**Reason**: Deleting now also works offline; replaced by "Add, edit, check off, claim and delete items offline".
**Migration**: None; every scenario carries over to the new requirement.
