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
A user SHALL be able to check off an open item and un-check a checked-off item. Checked-off items SHALL remain in the list, shown greyed out in a separate "Erledigt" section below the open items. The section header SHALL show the number of checked-off items, for example "Erledigt (3)". The section SHALL NOT be shown while no item is checked off.

#### Scenario: Checking off an item
- **WHEN** a user checks off the open item "Milch"
- **THEN** "Milch" is shown greyed out in the "Erledigt" section below all open items

#### Scenario: Un-checking an item
- **WHEN** a user un-checks the checked-off item "Milch"
- **THEN** "Milch" is shown again as an open item

#### Scenario: Checking off is not a toggle
- **WHEN** two users check off the same open item at the same time
- **THEN** the item is checked off for both users

#### Scenario: Count in the section header
- **WHEN** three items are checked off
- **THEN** the section header reads "Erledigt (3)"

#### Scenario: Nothing checked off
- **WHEN** no item is checked off
- **THEN** no "Erledigt" section is shown

### Requirement: Edit an item's text
A user SHALL be able to change the text of any item, open or checked off, in the row's edit mode. The new text SHALL follow the rules for adding an item: trimmed, not empty, at most 200 characters. Editing SHALL NOT change the item's checked state. An empty or unchanged text SHALL leave the item as it is.

#### Scenario: Editing an item
- **WHEN** a user edits the item "Milch" and saves "Hafermilch"
- **THEN** the item shows "Hafermilch" for every user

#### Scenario: Editing a checked-off item
- **WHEN** a user edits the checked-off item "Brot" and saves "Vollkornbrot"
- **THEN** "Vollkornbrot" is shown as checked off

#### Scenario: Cancelling an edit
- **WHEN** a user changes the text in the edit mode and cancels
- **THEN** the item keeps its previous text

#### Scenario: Saving an empty text
- **WHEN** a user clears the text in the edit mode, or enters only spaces, and saves
- **THEN** the item keeps its previous text

#### Scenario: Text too long through the API
- **WHEN** a client changes an item's text to more than 200 characters through the API
- **THEN** the request is refused and the text stays unchanged

#### Scenario: Surrounding spaces through the API
- **WHEN** a client changes an item's text to " Käse " through the API
- **THEN** the stored text is "Käse"

### Requirement: Editing does not shrink the check-off target
The buttons of a row SHALL NOT make checking off harder: tapping the item's text or the space around it, outside the claim and more buttons, SHALL still check the item off or un-check it.

#### Scenario: Tapping the item text
- **WHEN** a user taps the text of the open item "Milch"
- **THEN** "Milch" is checked off and the edit mode does not open

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
A user SHALL be able to claim an open item through a claim button next to the more button, to tell the others that they will get it. The button SHALL toggle: on an unclaimed item it claims the item for the user, on a claimed item it removes the claim, no matter who made it. Checked-off items SHALL NOT offer the claim button.

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
A claimed item SHALL be marked by a colored stripe on its leading edge and a tint of the same color, both within the list column, and SHALL show who claimed it below its text, in place of the creator and last editor: "<name> besorgt das" for someone else's claim, "Du besorgst das" for the user's own. Own claims SHALL use a stronger shade of the same color than other people's claims, in light and dark mode.

#### Scenario: Someone else's claim
- **WHEN** user A claims "Milch" and user B looks at the list
- **THEN** B sees "Milch" highlighted as claimed by someone else, with "A besorgt das" below the text

#### Scenario: Own claim
- **WHEN** user A claims "Milch" and looks at the list
- **THEN** A sees "Milch" highlighted as their own claim, with "Du besorgst das" below the text

#### Scenario: Claimant account removed while claimed
- **WHEN** an item is shown as claimed but the claimant's name is not known on the device
- **THEN** the item shows "Unbekannt besorgt das"

#### Scenario: Highlight stays within the column
- **WHEN** a claimed item is shown on a 360 px wide screen
- **THEN** its highlight does not extend beyond the left and right edges of the other rows

### Requirement: Claims expire
The server SHALL remove claims that are older than 3 hours, at the latest one hour after they expire. Removing an expired claim SHALL NOT change the item's last editor.

#### Scenario: Old claim
- **WHEN** "Milch" was claimed more than 3 hours ago and the cleanup runs
- **THEN** "Milch" is no longer claimed and still shows its previous last editor

#### Scenario: Recent claim
- **WHEN** "Milch" was claimed less than 3 hours ago and the cleanup runs
- **THEN** "Milch" is still claimed

### Requirement: Author metadata recorded by the server
For each item the server SHALL record which user created it and which user changed it last, taken from the authenticated request. Claiming an item and removing a claim count as changes. The list SHALL show both names on each open item that is not claimed. Checked-off items SHALL show neither name. Values sent by the client SHALL be ignored.

#### Scenario: Showing who added an item
- **WHEN** user A adds "Brot"
- **THEN** every user sees "Brot" with A's display name as creator and as last editor

#### Scenario: Showing who changed an item last
- **WHEN** user B un-checks "Brot", which user A added and checked off
- **THEN** "Brot" shows A as creator and B as last editor

#### Scenario: Showing who edited an item last
- **WHEN** user B changes the text of the open item "Brot", which user A added, to "Vollkornbrot"
- **THEN** "Vollkornbrot" shows A as creator and B as last editor

#### Scenario: Removing a claim makes the user last editor
- **WHEN** user B removes the claim on "Brot", which user A added
- **THEN** "Brot" shows A as creator and B as last editor

#### Scenario: Checked-off item shows no names
- **WHEN** user B checks off "Brot", which user A added
- **THEN** "Brot" shows neither a creator nor a last editor

#### Scenario: Forged author
- **WHEN** user A creates an item through the API and sends user B as creator and last editor
- **THEN** the stored item has user A as creator and as last editor

#### Scenario: Creator account removed
- **WHEN** the administrator deletes the account of an item's creator
- **THEN** the open item remains and shows "Unbekannt" instead of the creator's name

### Requirement: Delete an item
A user SHALL be able to permanently delete any item while online, from the row's edit mode. Deleting SHALL NOT ask for a further confirmation, for open and checked-off items alike, because the edit mode already shows the item's text and deleting takes a deliberate second step.

#### Scenario: Deleting a checked-off item
- **WHEN** a user deletes the checked-off item "Milch" in its edit mode
- **THEN** "Milch" disappears from the list of every user

#### Scenario: Deleting an open item
- **WHEN** a user deletes the open item "Brot" in its edit mode
- **THEN** "Brot" disappears from the list of every user without a further question

#### Scenario: Deleting while offline
- **WHEN** the device has no connection to the server and the user opens the edit mode of an item
- **THEN** deleting is shown as unavailable, with a hint that it only works online

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

### Requirement: Editing in the row
Each row SHALL have a "more" button that opens the row's edit mode in place: the row expands to show the item's text in an editable field and buttons to delete, cancel and save. Pressing Enter in the field SHALL save; Escape SHALL cancel. Only one row SHALL be in edit mode at a time. The field SHALL receive focus at once with the cursor at the end of the text, so the user can type right away; on phones the keyboard opens with it.

#### Scenario: Opening the edit mode
- **WHEN** a user taps the more button of "Milch"
- **THEN** the row of "Milch" expands in place with "Milch" in an editable text field and buttons to delete, cancel and save

#### Scenario: Keyboard
- **WHEN** a desktop user opens the edit mode of "Milch", changes the text and presses Enter
- **THEN** the new text is saved and the row closes

#### Scenario: Typing right away on a phone
- **WHEN** a phone user taps the more button of "Milch"
- **THEN** the text field has focus with the cursor after "Milch" and the keyboard opens

#### Scenario: Field stays visible above the phone keyboard
- **WHEN** a phone user opens the edit mode of a row near the bottom of the screen
- **THEN** the row is scrolled into view above the keyboard

#### Scenario: Opening another row
- **WHEN** a user has the edit mode of "Milch" open and taps the more button of "Brot"
- **THEN** "Milch" closes without changes and "Brot" opens in edit mode

### Requirement: Editing survives changes by others
While a row is in edit mode, changes to the list by other users SHALL NOT discard the typed text and SHALL NOT move the row. When the edited item is deleted by someone else, the edit mode SHALL close without changes.

#### Scenario: Someone adds an item while editing
- **WHEN** user A is typing in the edit mode of "Milch" and user B adds "Eier"
- **THEN** A's typed text and cursor stay in the field

#### Scenario: Someone checks off the item being edited
- **WHEN** user A has the edit mode of "Milch" open and user B checks off "Milch"
- **THEN** A's row stays in place in edit mode until A saves or cancels

#### Scenario: Item deleted by someone else while editing
- **WHEN** user A has the edit mode of "Milch" open and user B deletes "Milch"
- **THEN** A's edit mode closes without changes

### Requirement: The "Erledigt" section can be collapsed
The "Erledigt" section SHALL be collapsible through its header, which SHALL work by tap, mouse and keyboard. The section SHALL be collapsed by default. Each device SHALL remember whether the section is open, also across logout and restarts; this setting SHALL NOT be shared with other devices.

#### Scenario: Collapsed by default
- **WHEN** a user opens the app on a device for the first time and items are checked off
- **THEN** the "Erledigt" header with the count is shown and the checked-off items are hidden

#### Scenario: Expanding
- **WHEN** a user activates the collapsed "Erledigt" header
- **THEN** the checked-off items are shown below it

#### Scenario: Remembered per device
- **WHEN** a user expands the section and reloads the app
- **THEN** the section is still expanded on this device
- **AND** it is still collapsed on other devices where it was collapsed

### Requirement: Own changes do not move rows under the finger
After a user checks off or un-checks an item, the row SHALL stay in its place showing its new state until the user has not checked off or un-checked any item for about 1.5 seconds. Only then SHALL the rows move to their sorted positions. Changes made by other users SHALL be applied without this delay.

#### Scenario: Checking off several items quickly
- **WHEN** a user checks off "Milch" and, within one second, the item directly below it, "Brot"
- **THEN** both rows stay in place until about 1.5 seconds after the second tap
- **AND** then both move into the "Erledigt" section

#### Scenario: Undoing a mistaken check-off
- **WHEN** a user checks off "Milch" and un-checks it again within one second
- **THEN** "Milch" stays in its place as an open item

#### Scenario: Un-checking an item
- **WHEN** a user un-checks "Milch" in the expanded "Erledigt" section
- **THEN** "Milch" stays in its place, shown as open, for about 1.5 seconds
- **AND** then moves to its position among the open items

#### Scenario: Change by another user
- **WHEN** user B checks off "Brot" while user A looks at the list
- **THEN** A sees "Brot" move into the "Erledigt" section without a delay

### Requirement: Checking off draws a strike-through
When the user checks off an item, a line SHALL be drawn across its text from start to end, like crossing an item off a paper list, and the text SHALL turn to the muted color. Un-checking SHALL remove the line at once. When the user prefers reduced motion, the line SHALL appear without being drawn.

#### Scenario: Checking off
- **WHEN** a user checks off "Milch"
- **THEN** a line is drawn across "Milch" within a fraction of a second and stays while the row is held in place

#### Scenario: Reduced motion
- **WHEN** the user prefers reduced motion and checks off "Milch"
- **THEN** "Milch" is shown struck through at once

### Requirement: Reordering is animated
When rows move to new positions, appear or disappear, the move SHALL be animated where the browser supports it, so users can see where an item went. Animations SHALL be switched off when the user prefers reduced motion. Browsers without support SHALL show the new order immediately.

#### Scenario: Animated move
- **WHEN** a checked-off item moves into the "Erledigt" section in a browser that supports the animation
- **THEN** the row moves visibly from its old to its new position

#### Scenario: Reduced motion
- **WHEN** the user prefers reduced motion and an item moves
- **THEN** the new order is shown without animation

### Requirement: Empty list state
While there are no open items, the list SHALL show an empty state with an icon and the text "Alles erledigt. Was wird als Nächstes gebraucht?" in place of the open items. The "Erledigt" section SHALL still be shown below it when items are checked off.

#### Scenario: Empty list
- **WHEN** the list contains no items
- **THEN** the empty state is shown

#### Scenario: Only checked-off items
- **WHEN** all items are checked off
- **THEN** the empty state is shown above the "Erledigt" section
