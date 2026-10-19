# Spec Delta

## Purpose

Remembers what the family has bought and suggests those items while a family member adds a new one, so recurring purchases take two letters and a tap instead of typing the whole text.

## ADDED Requirements

### Requirement: Check-offs are recorded as purchases
When a family member checks off an open item, the server SHALL count one purchase of the item's current text and remember the text as written and the time. Texts that differ only in upper and lower case SHALL count as the same purchase, which then shows the text as last written.

#### Scenario: First purchase of a text
- **WHEN** a user checks off "Milch" and "Milch" was never bought before
- **THEN** the purchase "Milch" exists with a count of 1

#### Scenario: Repeated purchase in other spelling
- **WHEN** "Milch" was bought 3 times and a user checks off "milch"
- **THEN** the purchase has a count of 4 and shows "milch"

#### Scenario: Adding or editing is not a purchase
- **WHEN** a user adds "Milch" and changes its text to "Milch 2x" without checking it off
- **THEN** no purchase is counted

#### Scenario: Edited text is counted when checked off
- **WHEN** a user changes "Milch" to "Milch 2x" and then checks it off
- **THEN** one purchase of "Milch 2x" is counted and the purchase "Milch" is unchanged

#### Scenario: Repeated delivery of a check-off
- **WHEN** the same check-off of "Milch" reaches the server twice, for example after an interrupted offline synchronization
- **THEN** one purchase is counted

### Requirement: Un-checking takes a purchase back
When a family member un-checks an item, the server SHALL take back one purchase of the item's current text. A purchase whose count reaches zero SHALL be removed. When no purchase exists for the text, nothing SHALL change, and a count SHALL never become negative.

#### Scenario: Mistaken check-off
- **WHEN** a user checks off "Mlich", which was never bought before, and un-checks it again
- **THEN** no purchase "Mlich" exists

#### Scenario: Un-checking a frequent purchase
- **WHEN** "Brot" was bought 5 times, including the current check-off, and a user un-checks "Brot"
- **THEN** the purchase "Brot" has a count of 4

#### Scenario: Text changed after the check-off
- **WHEN** a user checks off "Milch", changes the checked-off item to "Milch 2x" and un-checks it, and no purchase "Milch 2x" exists
- **THEN** no purchase changes

### Requirement: Recording a purchase never blocks the item change
A failure to record or take back a purchase SHALL NOT make the check-off or un-check fail. The failure SHALL be logged on the server.

#### Scenario: Purchase cannot be written
- **WHEN** recording the purchase fails while a user checks off "Milch"
- **THEN** "Milch" is checked off for every user and the failure is in the server log

### Requirement: Old purchases expire
The server SHALL delete purchases that were last bought more than 3 months ago. The check SHALL run with the existing hourly cleanup.

#### Scenario: Purchase not bought for 3 months
- **WHEN** a purchase was last bought more than 3 months ago and the cleanup runs
- **THEN** the purchase is deleted and no longer suggested

#### Scenario: Recent purchase
- **WHEN** a purchase was last bought less than 3 months ago and the cleanup runs
- **THEN** the purchase remains

### Requirement: Purchases are read-only for family members
Family members SHALL be able to read all purchases and SHALL NOT be able to create, change or delete them through the API. Only the server and the administrator SHALL change purchases. Clients that are not logged in as a family member SHALL NOT read them.

#### Scenario: Family member reads purchases
- **WHEN** a logged-in family member lists the purchases through the API
- **THEN** the request succeeds

#### Scenario: Family member tries to change a purchase
- **WHEN** a logged-in family member tries to create, change or delete a purchase through the API
- **THEN** the request is refused and the purchases stay unchanged

#### Scenario: Anonymous client
- **WHEN** a client without a login lists the purchases
- **THEN** it receives no purchases

### Requirement: Suggestions while adding an item
While the add field contains at least 2 characters, the app SHALL show up to 5 past purchases below it whose text contains the typed text, ignoring upper and lower case. Purchases whose text starts with the typed text, or has a word starting with it, SHALL come before purchases containing it inside a word. Within each group, more frequent purchases SHALL come first.

#### Scenario: Matching by word start
- **WHEN** "Milch" was bought 14 times, "Mineralwasser" 3 times and "Hafermilch" 5 times, and the user types "mi"
- **THEN** the suggestions are "Milch", "Mineralwasser" and "Hafermilch" in that order

#### Scenario: Too short to suggest
- **WHEN** the user types a single character
- **THEN** no suggestions are shown

#### Scenario: At most five
- **WHEN** 8 past purchases match the typed text
- **THEN** the 5 highest-ranked are shown

#### Scenario: Nothing matches
- **WHEN** no past purchase contains the typed text
- **THEN** no suggestion list is shown

### Requirement: Choosing a suggestion adds it at once
Tapping or clicking a suggestion SHALL add an item with the suggestion's text right away, clear the add field, hide the suggestions and keep the focus in the add field, so the phone keyboard stays open. The new item SHALL behave like any other added item, including offline.

#### Scenario: Tapping a suggestion
- **WHEN** the user types "mi" and taps "Milch"
- **THEN** "Milch" is added to the list, the add field is empty and keeps the focus

#### Scenario: Typed text is kept when no suggestion is chosen
- **WHEN** the user types "Milch" while "Milch 2x" is suggested and submits the field without selecting a suggestion
- **THEN** "Milch" is added, not "Milch 2x"

### Requirement: Suggestions can be chosen by keyboard
In the add field, the down and up arrow keys SHALL move a selection through the available suggestions, Enter SHALL add the selected suggestion, and Escape SHALL hide the suggestions. Without a selection, Enter SHALL add the typed text as before. The field and the list SHALL expose the selection to assistive technology as a combobox with a list of options.

#### Scenario: Selecting with arrow keys
- **WHEN** a desktop user types "mi", presses the down arrow once and presses Enter
- **THEN** the first suggestion is added and the field is empty

#### Scenario: Escape
- **WHEN** suggestions are shown and the user presses Escape
- **THEN** the suggestions are hidden and the typed text stays

### Requirement: Items already on the list are marked
A suggestion whose text, ignoring upper and lower case, equals an open item SHALL be shown greyed out with "steht schon drauf" and SHALL NOT be selectable, neither by tap nor by keyboard. Checked-off items SHALL NOT block a suggestion.

#### Scenario: Open item
- **WHEN** "Milch" is an open item and the user types "mi"
- **THEN** "Milch" is suggested greyed out with "steht schon drauf" and tapping it adds nothing

#### Scenario: Checked-off item
- **WHEN** "Brot" was checked off today and the user types "br"
- **THEN** "Brot" is suggested and can be added

### Requirement: Suggestions work offline
Suggestions SHALL be available without a connection, based on the purchases received with the last synchronization, and SHALL survive a restart of the app. New purchases by other family members SHALL appear in the suggestions after the next synchronization.

#### Scenario: Suggesting offline
- **WHEN** the device has synchronized before and is offline, and the user types "mi"
- **THEN** past purchases matching "mi" are suggested

#### Scenario: Typing needs no connection
- **WHEN** the user types into the add field on a slow connection or without one
- **THEN** suggestions appear without any request to the server

#### Scenario: Purchase by someone else
- **WHEN** user B checks off "Kaffee" for the first time while user A is online
- **THEN** "Kaffee" is suggested to A at the latest after A's next synchronization

### Requirement: Suggestions never hold up the list
Loading the purchases for suggestions SHALL NOT delay, block or break the synchronization of the list. When loading purchases fails or is slow, the list SHALL be synchronized as usual, the device SHALL keep the purchases it already has, and the user SHALL see no error or offline notice because of it. A response that arrives after logout SHALL NOT be stored.

#### Scenario: Purchases cannot be loaded
- **WHEN** the purchases request fails while the rest of the server is reachable
- **THEN** the list is synchronized, the app shows no offline or error notice, and the previous suggestions remain

#### Scenario: Slow purchases
- **WHEN** the purchases request takes long to answer
- **THEN** the list is synchronized without waiting for it, and the suggestions update once it arrives

#### Scenario: Logout while loading
- **WHEN** the user logs out before a running purchases request answers
- **THEN** no purchases are stored on the device
