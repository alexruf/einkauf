# Spec Delta

## MODIFIED Requirements

### Requirement: Add, edit, check off, claim and delete items offline
While offline, a user SHALL be able to add items, edit their text and note, check off items, un-check items, claim items, remove claims and delete items. These changes SHALL be shown immediately; all but deletes SHALL be marked as not yet synchronized, while a deleted item disappears from the list at once. Other users see a change made offline only after it is synchronized.

#### Scenario: Changes made offline
- **WHEN** a user adds "Eier" and checks off "Milch" while offline
- **THEN** "Eier" appears as an open item and "Milch" as checked off
- **AND** both are marked as not yet synchronized

#### Scenario: Editing offline
- **WHEN** a user changes the text of "Milch" to "Hafermilch" while offline
- **THEN** the item shows "Hafermilch" and is marked as not yet synchronized
- **AND** after the connection returns, other users see "Hafermilch"

#### Scenario: Adding and editing a note offline
- **WHEN** a user adds "Eier, 10" and changes the note of "Milch" to "2x" while offline
- **THEN** the rows show "Eier · 10" and "Milch · 2x", marked as not yet synchronized
- **AND** after the connection returns, other users see both notes

#### Scenario: Text and note changed on different devices
- **WHEN** user A changes the note of "Milch" to "2x" offline while user B changes its text to "Hafermilch" online, and A reconnects
- **THEN** every user sees "Hafermilch · 2x"

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
