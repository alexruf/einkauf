# Spec Delta

## MODIFIED Requirements

### Requirement: Check-offs are recorded as purchases
When a family member checks off an open item, the server SHALL count one purchase of the item's current text and remember the text as written and the time. The item's note SHALL NOT be part of the purchase. Texts that differ only in upper and lower case SHALL count as the same purchase, which then shows the text as last written.

#### Scenario: First purchase of a text
- **WHEN** a user checks off "Milch" and "Milch" was never bought before
- **THEN** the purchase "Milch" exists with a count of 1

#### Scenario: Repeated purchase in other spelling
- **WHEN** "Milch" was bought 3 times and a user checks off "milch"
- **THEN** the purchase has a count of 4 and shows "milch"

#### Scenario: Item with a note
- **WHEN** "Milch" was bought 3 times and a user checks off an item with the text "Milch" and the note "2x"
- **THEN** the purchase "Milch" has a count of 4 and no purchase "Milch 2x" or "2x" exists

#### Scenario: Adding or editing is not a purchase
- **WHEN** a user adds "Milch" and changes its text to "Milch 2x" without checking it off
- **THEN** no purchase is counted

#### Scenario: Edited text is counted when checked off
- **WHEN** a user changes "Milch" to "Milch 2x" and then checks it off
- **THEN** one purchase of "Milch 2x" is counted and the purchase "Milch" is unchanged

#### Scenario: Repeated delivery of a check-off
- **WHEN** the same check-off of "Milch" reaches the server twice, for example after an interrupted offline synchronization
- **THEN** one purchase is counted

### Requirement: Suggestions while adding an item
While the text part of the add field, which ends at a separator that starts a note, contains at least 2 characters, the app SHALL show up to 5 past purchases below it whose text contains that text part, ignoring upper and lower case. Purchases whose text starts with the text part, or has a word starting with it, SHALL come before purchases containing it inside a word. Within each group, more frequent purchases SHALL come first.

#### Scenario: Matching by word start
- **WHEN** "Milch" was bought 14 times, "Mineralwasser" 3 times and "Hafermilch" 5 times, and the user types "mi"
- **THEN** the suggestions are "Milch", "Mineralwasser" and "Hafermilch" in that order

#### Scenario: Typing a note
- **WHEN** "Milch" was bought before and the user types "milch, 2"
- **THEN** "Milch" is suggested

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
Tapping or clicking a suggestion SHALL add an item with the suggestion's text and the note typed after a separator, if any, right away, clear the add field, hide the suggestions and keep the focus in the add field, so the phone keyboard stays open. The new item SHALL behave like any other added item, including offline.

#### Scenario: Tapping a suggestion
- **WHEN** the user types "mi" and taps "Milch"
- **THEN** "Milch" is added to the list, the add field is empty and keeps the focus

#### Scenario: Tapping a suggestion after typing a note
- **WHEN** the user types "mi; 2x" and taps "Milch"
- **THEN** an item with the text "Milch" and the note "2x" is added and the add field is empty

#### Scenario: Typed text is kept when no suggestion is chosen
- **WHEN** the user types "Milch" while "Milch 2x" is suggested and submits the field without selecting a suggestion
- **THEN** "Milch" is added, not "Milch 2x"

### Requirement: Suggestions can be chosen by keyboard
In the add field, the down and up arrow keys SHALL move a selection through the available suggestions, Enter SHALL add the selected suggestion as tapping it would, and Escape SHALL hide the suggestions. Without a selection, Enter SHALL add the typed text as before. The field and the list SHALL expose the selection to assistive technology as a combobox with a list of options.

#### Scenario: Selecting with arrow keys
- **WHEN** a desktop user types "mi", presses the down arrow once and presses Enter
- **THEN** the first suggestion is added and the field is empty

#### Scenario: Selecting with arrow keys after typing a note
- **WHEN** a desktop user types "mi, 2x", presses the down arrow once and presses Enter
- **THEN** the first suggestion is added with the note "2x" and the field is empty

#### Scenario: Escape
- **WHEN** suggestions are shown and the user presses Escape
- **THEN** the suggestions are hidden and the typed text stays

### Requirement: Items already on the list are marked
A suggestion whose text, ignoring upper and lower case, equals the text of an open item, whatever that item's note, SHALL be shown greyed out with "steht schon drauf" and SHALL NOT be selectable, neither by tap nor by keyboard. Checked-off items SHALL NOT block a suggestion.

#### Scenario: Open item
- **WHEN** "Milch" is an open item and the user types "mi"
- **THEN** "Milch" is suggested greyed out with "steht schon drauf" and tapping it adds nothing

#### Scenario: Open item with a note
- **WHEN** "Milch · 2x" is an open item and the user types "mi"
- **THEN** "Milch" is suggested greyed out with "steht schon drauf"

#### Scenario: Checked-off item
- **WHEN** "Brot" was checked off today and the user types "br"
- **THEN** "Brot" is suggested and can be added
