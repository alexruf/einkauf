# Spec Delta

## ADDED Requirements

### Requirement: Header stays in view while the list scrolls
On the list screen, the header with the app name and the account button and the add field SHALL stay together at the top of the screen while the list scrolls beneath them, like the status bar stays at the bottom. They SHALL stay clear of the system status bar on devices with a notch. A row that the app or the browser scrolls into view SHALL end up fully visible below them, not hidden beneath them.

#### Scenario: Scrolling a long list
- **WHEN** a logged-in user scrolls down a list that is longer than the screen
- **THEN** the app name, the account button and the add field stay visible at the top of the screen
- **AND** the rows pass beneath them

#### Scenario: Header at the top of the list
- **WHEN** a logged-in user opens the list without scrolling
- **THEN** the header and the add field are shown above the first row as before

#### Scenario: Phone with a notch
- **WHEN** the installed app runs on a phone with a notch and the list is scrolled
- **THEN** the app name, the account button and the add field are not covered by the system status bar

#### Scenario: Duplicate scrolled out of view
- **WHEN** the open item "Milch" is scrolled out of view and the user adds "Milch"
- **THEN** the row "Milch" is scrolled into view completely below the add field

#### Scenario: Editing a row while scrolled
- **WHEN** the list is scrolled and the user opens the edit mode of a row near the top of the screen
- **THEN** the row's fields are fully visible below the add field

### Requirement: Compact status bar
The status bar at the bottom of the screen SHALL take no more height than its content needs, so the list keeps as much room as possible. Because it holds no controls, on devices with a home indicator its content MAY reach into the area reserved at the bottom of the screen, but SHALL stay clear of the home indicator itself.

#### Scenario: Phone without a home indicator
- **WHEN** a logged-in user views the list on a 360 px wide phone
- **THEN** the status bar is at most 36 px high

#### Scenario: Phone with a home indicator
- **WHEN** the installed app runs on a phone with a home indicator
- **THEN** the space below the status bar's text is smaller than the reserved area at the bottom of the screen
- **AND** the text does not touch the home indicator

#### Scenario: Rows sliding past the status bar
- **WHEN** rows slide to a new place near the bottom of the screen
- **THEN** they pass beneath the status bar, not over it
