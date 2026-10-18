# Spec Delta

## ADDED Requirements

### Requirement: Edit an item's text
A user SHALL be able to change the text of any item, open or checked off, through an edit button next to the delete button. The new text SHALL follow the rules for adding an item: trimmed, not empty, at most 200 characters. Editing SHALL NOT change the item's checked state. An empty or unchanged text SHALL leave the item as it is.

#### Scenario: Editing an item
- **WHEN** a user edits the item "Milch" and saves "Hafermilch"
- **THEN** the item shows "Hafermilch" for every user

#### Scenario: Editing a checked-off item
- **WHEN** a user edits the checked-off item "Brot" and saves "Vollkornbrot"
- **THEN** "Vollkornbrot" is shown as checked off

#### Scenario: Cancelling an edit
- **WHEN** a user changes the text in the edit dialog and cancels
- **THEN** the item keeps its previous text

#### Scenario: Saving an empty text
- **WHEN** a user clears the text in the edit dialog, or enters only spaces, and saves
- **THEN** the item keeps its previous text

#### Scenario: Text too long through the API
- **WHEN** a client changes an item's text to more than 200 characters through the API
- **THEN** the request is refused and the text stays unchanged

#### Scenario: Surrounding spaces through the API
- **WHEN** a client changes an item's text to " Käse " through the API
- **THEN** the stored text is "Käse"

### Requirement: Editing does not shrink the check-off target
The edit button SHALL NOT make checking off harder: tapping the item's text or the space around it, outside the edit and delete buttons, SHALL still check the item off or un-check it.

#### Scenario: Tapping the item text
- **WHEN** a user taps the text of the open item "Milch"
- **THEN** "Milch" is checked off and no edit dialog opens

### Requirement: Only the checked state and the text can be changed
Through the API, users SHALL only be able to change an item's checked state and its text. Author metadata and the time it was checked off SHALL NOT be changeable by users.

#### Scenario: Changing the text through the API
- **WHEN** an authenticated user sends an update that changes an item's text to "Kuchen"
- **THEN** the item's text is "Kuchen"

#### Scenario: Forging the creator on update
- **WHEN** user B updates an item that user A created and sends user B as creator
- **THEN** the stored item still has user A as creator

## MODIFIED Requirements

### Requirement: Author metadata recorded by the server
For each item the server SHALL record which user created it and which user changed it last, taken from the authenticated request. The list SHALL show both names on each item. Values sent by the client SHALL be ignored.

#### Scenario: Showing who added an item
- **WHEN** user A adds "Brot"
- **THEN** every user sees "Brot" with A's display name as creator and as last editor

#### Scenario: Showing who changed an item last
- **WHEN** user B checks off "Brot", which user A added
- **THEN** "Brot" shows A as creator and B as last editor

#### Scenario: Showing who edited an item last
- **WHEN** user B changes the text of "Brot", which user A added, to "Vollkornbrot"
- **THEN** "Vollkornbrot" shows A as creator and B as last editor

#### Scenario: Forged author
- **WHEN** user A creates an item through the API and sends user B as creator and last editor
- **THEN** the stored item has user A as creator and as last editor

#### Scenario: Creator account removed
- **WHEN** the administrator deletes the account of an item's creator
- **THEN** the item remains and shows "Unbekannt" instead of the creator's name

### Requirement: Live updates
Changes made by one user SHALL appear on the screens of all other logged-in users without a manual reload while they are online.

#### Scenario: Live update on another device
- **WHEN** user A adds, edits, checks off, un-checks or deletes an item while user B has the app open and online
- **THEN** user B's list reflects the change within a few seconds without reloading

## REMOVED Requirements

### Requirement: Only the checked state can be changed
**Reason**: Users can now edit an item's text.
**Migration**: Replaced by "Only the checked state and the text can be changed". Clients that relied on text updates being refused must not send them.
