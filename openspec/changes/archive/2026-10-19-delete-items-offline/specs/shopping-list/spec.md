# Spec Delta

## MODIFIED Requirements

### Requirement: Delete an item
A user SHALL be able to permanently delete any item from the row's edit mode, online and offline. Deleting SHALL NOT ask for a further confirmation, for open and checked-off items alike, because the edit mode already shows the item's text and deleting takes a deliberate second step.

#### Scenario: Deleting a checked-off item
- **WHEN** a user deletes the checked-off item "Milch" in its edit mode
- **THEN** "Milch" disappears from the list of every user

#### Scenario: Deleting an open item
- **WHEN** a user deletes the open item "Brot" in its edit mode
- **THEN** "Brot" disappears from the list of every user without a further question

#### Scenario: Deleting while offline
- **WHEN** the device has no connection to the server and the user deletes "Käse" in its edit mode
- **THEN** "Käse" disappears from the user's list at once
- **AND** after the connection returns, "Käse" disappears from the list of every user

#### Scenario: Deleting an item that is not synchronized yet
- **WHEN** a user adds "Eier" offline and then deletes it
- **THEN** "Eier" disappears from the user's list
- **AND** after the connection returns, "Eier" is not in anyone's list
