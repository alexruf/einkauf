# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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

### Requirement: Live updates
Changes made by one user SHALL appear on the screens of all other logged-in users without a manual reload while they are online.

#### Scenario: Live update on another device
- **WHEN** user A adds, edits, checks off, un-checks, claims, removes a claim on or deletes an item while user B has the app open and online
- **THEN** user B's list reflects the change within a few seconds without reloading

#### Scenario: Expired claim on another device
- **WHEN** the server removes an expired claim while user B has the app open and online
- **THEN** user B's list shows the item as not claimed without reloading

## REMOVED Requirements

### Requirement: Only the checked state and the text can be changed
**Reason**: Users can now also claim items and remove claims.
**Migration**: Replaced by "Only the checked state, the text and the claim can be changed", which keeps all previous scenarios.
