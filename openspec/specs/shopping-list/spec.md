# shopping-list Specification

## Purpose

Provides the family's shared shopping list: adding items, checking them off and back on, deleting them, seeing who changed what, and receiving changes from others live.

## Requirements

### Requirement: One shared list for all family members
All authenticated users SHALL see and change the same list of items.

#### Scenario: Item added by another family member
- **WHEN** user A adds an item
- **THEN** user B sees the item in their list

### Requirement: Add an item
A user SHALL be able to add an item by entering its text. The text SHALL be trimmed, MUST NOT be empty and MUST NOT exceed 200 characters. New items SHALL be unchecked.

#### Scenario: Adding an item
- **WHEN** a user enters "Milch" and confirms
- **THEN** an unchecked item "Milch" appears in the list

#### Scenario: Empty text
- **WHEN** a user confirms an empty or whitespace-only text
- **THEN** no item is created

#### Scenario: Text too long
- **WHEN** a client submits an item with more than 200 characters through the API
- **THEN** the request is refused and no item is created

### Requirement: Check off and un-check an item
A user SHALL be able to check off an open item and un-check a checked-off item. Checked-off items SHALL remain in the list, shown greyed out below the open items.

#### Scenario: Checking off an item
- **WHEN** a user checks off the open item "Milch"
- **THEN** "Milch" is shown greyed out below all open items

#### Scenario: Un-checking an item
- **WHEN** a user un-checks the checked-off item "Milch"
- **THEN** "Milch" is shown again as an open item

#### Scenario: Checking off is not a toggle
- **WHEN** two users check off the same open item at the same time
- **THEN** the item is checked off for both users

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

### Requirement: Only the checked state, the text and the claim can be changed
Through the API, users SHALL only be able to change an item's checked state, its text and whether it is claimed by themselves. Author metadata, the claimant, and the times it was checked off and claimed SHALL NOT be set by users.

#### Scenario: Changing the text through the API
- **WHEN** an authenticated user sends an update that changes an item's text to "Kuchen"
- **THEN** the item's text is "Kuchen"

#### Scenario: Forging the creator on update
- **WHEN** user B updates an item that user A created and sends user B as creator
- **THEN** the stored item still has user A as creator

#### Scenario: Claiming on create
- **WHEN** user A creates an item through the API and sends a claimant
- **THEN** the new item is not claimed

### Requirement: Claim an open item
A user SHALL be able to claim an open item through a claim button next to the edit button, to tell the others that they will get it. The button SHALL toggle: on an unclaimed item it claims the item for the user, on a claimed item it removes the claim, no matter who made it. Checked-off items SHALL NOT offer the claim button.

#### Scenario: Claiming an item
- **WHEN** user A taps the claim button of the open, unclaimed item "Milch"
- **THEN** "Milch" is claimed by A for every user

#### Scenario: Removing one's own claim
- **WHEN** user A taps the claim button of "Milch", which A claimed
- **THEN** "Milch" is no longer claimed

#### Scenario: Removing someone else's claim
- **WHEN** user B taps the claim button of "Milch", which A claimed
- **THEN** "Milch" is no longer claimed
- **AND** B is not shown as claiming it

#### Scenario: Taking over a claim
- **WHEN** user B removes A's claim on "Milch" and then taps the claim button again
- **THEN** "Milch" is claimed by B

#### Scenario: Checked-off item
- **WHEN** a user looks at the checked-off item "Brot"
- **THEN** "Brot" shows no claim button

### Requirement: Checking off removes the claim
Checking off an item SHALL remove its claim. Un-checking SHALL NOT restore it. A claim sent for an item that is checked off SHALL leave the item unclaimed.

#### Scenario: Checking off a claimed item
- **WHEN** user B checks off "Milch", which A claimed
- **THEN** "Milch" is checked off and not claimed

#### Scenario: Un-checking a previously claimed item
- **WHEN** a user un-checks "Milch", which was claimed before it was checked off
- **THEN** "Milch" is open and not claimed

#### Scenario: Claiming a checked-off item through the API
- **WHEN** a client claims the checked-off item "Brot" through the API
- **THEN** "Brot" stays checked off and not claimed

### Requirement: Claimant recorded by the server
The server SHALL record the claiming user from the authenticated request. A user SHALL NOT be able to claim an item in someone else's name. Repeating a claim by the same user SHALL NOT change the time of the claim.

#### Scenario: Forged claimant
- **WHEN** user B claims "Milch" through the API and sends user A as claimant
- **THEN** "Milch" is claimed by B

#### Scenario: Repeated claim
- **WHEN** user A's claim on "Milch" reaches the server twice
- **THEN** the time of the claim is the time of the first one

#### Scenario: Claimant account removed
- **WHEN** the administrator deletes the account of the user who claimed "Milch"
- **THEN** "Milch" remains in the list and is not claimed

### Requirement: Claimed items are highlighted
A claimed item SHALL have a subtle background color and SHALL show who claimed it below its text, in place of the creator and last editor: "<name> besorgt das" for someone else's claim, "Du besorgst das" for the user's own. Own claims SHALL use a slightly stronger shade of the same color than other people's claims.

#### Scenario: Someone else's claim
- **WHEN** user A claims "Milch" and user B looks at the list
- **THEN** B sees "Milch" highlighted as claimed by someone else, with "A besorgt das" below the text

#### Scenario: Own claim
- **WHEN** user A claims "Milch" and looks at the list
- **THEN** A sees "Milch" highlighted as their own claim, with "Du besorgst das" below the text

#### Scenario: Claimant account removed while claimed
- **WHEN** an item is shown as claimed but the claimant's name is not known on the device
- **THEN** the item shows "Unbekannt besorgt das"

### Requirement: Claims expire
The server SHALL remove claims that are older than 3 hours, at the latest one hour after they expire. Removing an expired claim SHALL NOT change the item's last editor.

#### Scenario: Old claim
- **WHEN** "Milch" was claimed more than 3 hours ago and the cleanup runs
- **THEN** "Milch" is no longer claimed and still shows its previous last editor

#### Scenario: Recent claim
- **WHEN** "Milch" was claimed less than 3 hours ago and the cleanup runs
- **THEN** "Milch" is still claimed

### Requirement: Author metadata recorded by the server
For each item the server SHALL record which user created it and which user changed it last, taken from the authenticated request. Claiming an item and removing a claim count as changes. The list SHALL show both names on each item that is not claimed. Values sent by the client SHALL be ignored.

#### Scenario: Showing who added an item
- **WHEN** user A adds "Brot"
- **THEN** every user sees "Brot" with A's display name as creator and as last editor

#### Scenario: Showing who changed an item last
- **WHEN** user B checks off "Brot", which user A added
- **THEN** "Brot" shows A as creator and B as last editor

#### Scenario: Showing who edited an item last
- **WHEN** user B changes the text of "Brot", which user A added, to "Vollkornbrot"
- **THEN** "Vollkornbrot" shows A as creator and B as last editor

#### Scenario: Removing a claim makes the user last editor
- **WHEN** user B removes the claim on "Brot", which user A added
- **THEN** "Brot" shows A as creator and B as last editor

#### Scenario: Forged author
- **WHEN** user A creates an item through the API and sends user B as creator and last editor
- **THEN** the stored item has user A as creator and as last editor

#### Scenario: Creator account removed
- **WHEN** the administrator deletes the account of an item's creator
- **THEN** the item remains and shows "Unbekannt" instead of the creator's name

### Requirement: Delete an item
A user SHALL be able to permanently delete any item while online. Before deleting an unchecked item, the app SHALL ask for confirmation. Checked-off items SHALL be deleted without confirmation.

#### Scenario: Deleting a checked-off item
- **WHEN** a user deletes the checked-off item "Milch"
- **THEN** "Milch" disappears from the list of every user

#### Scenario: Deleting an open item
- **WHEN** a user deletes the open item "Brot"
- **THEN** the app asks for confirmation before deleting
- **AND** "Brot" stays in the list if the user cancels

#### Scenario: Deleting while offline
- **WHEN** the device has no connection to the server
- **THEN** the app does not offer to delete items

### Requirement: Live updates
Changes made by one user SHALL appear on the screens of all other logged-in users without a manual reload while they are online.

#### Scenario: Live update on another device
- **WHEN** user A adds, edits, checks off, un-checks, claims, removes a claim on or deletes an item while user B has the app open and online
- **THEN** user B's list reflects the change within a few seconds without reloading

#### Scenario: Expired claim on another device
- **WHEN** the server removes an expired claim while user B has the app open and online
- **THEN** user B's list shows the item as not claimed without reloading

### Requirement: Automatic cleanup of checked-off items
The server SHALL permanently delete items that have been checked off for more than 24 hours. Un-checking an item SHALL reset this period.

#### Scenario: Old checked-off item
- **WHEN** an item has been checked off for more than 24 hours and the cleanup runs
- **THEN** the item is deleted

#### Scenario: Recently checked-off item
- **WHEN** an item has been checked off for less than 24 hours and the cleanup runs
- **THEN** the item remains

#### Scenario: Open item
- **WHEN** an item was created more than 24 hours ago and is not checked off when the cleanup runs
- **THEN** the item remains
