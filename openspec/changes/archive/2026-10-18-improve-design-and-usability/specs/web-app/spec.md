# Spec Delta

## ADDED Requirements

### Requirement: Consistent design in light and dark mode
All screens, including the login screen, header, account menu, list, dialogs and status bar, SHALL share one visual design and follow the device's light or dark mode. Controls SHALL look the same on every platform: checkboxes in particular SHALL NOT use the platform's native look and SHALL NOT appear darker than the background in dark mode.

#### Scenario: Dark mode
- **WHEN** a user opens the app on a phone set to dark mode
- **THEN** every screen is shown in dark colors
- **AND** unchecked checkboxes are drawn as an outline on the row's background, not as a dark filled square

#### Scenario: Checked checkbox
- **WHEN** an item is checked off
- **THEN** its checkbox is filled with the accent color and shows a check mark, in light and dark mode

### Requirement: Legible text
All text SHALL meet WCAG AA contrast against its background in light and dark mode: at least 4.5:1 for normal text and 3:1 for text of 24 px and larger. Item text SHALL be at least 17 px. The app SHALL use a font that tells I, l and 1 and O and 0 clearly apart, shipped with the app so it also works offline.

#### Scenario: Contrast of secondary text
- **WHEN** the meta line of an item is shown in light or dark mode
- **THEN** its contrast against the row background is at least 4.5:1

#### Scenario: Font offline
- **WHEN** the installed app is opened without a connection
- **THEN** item text is shown in the app's own font, not a fallback

### Requirement: Every action works without gestures and hover
Every action SHALL be reachable through a visible button that can be used by tap, by mouse and by keyboard. Gestures MAY be added only as shortcuts for such a button. No control SHALL appear only while the mouse hovers over it.

#### Scenario: Keyboard only
- **WHEN** a desktop user uses only the keyboard
- **THEN** they can add an item, check it off, claim it, edit it, delete it and expand the "Erledigt" section

#### Scenario: Touch only
- **WHEN** a phone user uses only taps
- **THEN** every action of the app is reachable without swiping or long-pressing

### Requirement: Dialogs suit one-handed use
On phone-sized screens, dialogs SHALL open at the bottom of the screen, within reach of the thumb. Text input SHALL NOT happen in dialogs anchored to the bottom, because the phone keyboard would cover them; editing happens in the list instead. On wider screens they SHALL open centered. Every dialog SHALL close with Escape and with its cancel button.

#### Scenario: Phone
- **WHEN** a user asks to log out on a 390 px wide phone screen
- **THEN** the confirmation is anchored to the bottom of the screen

#### Scenario: Desktop
- **WHEN** a user asks to log out in a desktop browser
- **THEN** the confirmation is centered on the screen and closes on Escape

### Requirement: Compact add button
The button that adds an item SHALL be an icon button showing "+", with "Hinzufügen" as its accessible name, so the text field gets most of the row's width. The add field SHALL stay at the top of the list.

#### Scenario: Adding with the button
- **WHEN** a user enters "Milch" and taps the "+" button
- **THEN** "Milch" is added to the list

#### Scenario: Accessible name
- **WHEN** a screen reader user focuses the "+" button
- **THEN** it is announced as "Hinzufügen"
