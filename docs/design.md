# Design

The app should look like what it replaces: a paper shopping list that gets
crossed off. We call this look "Einkaufszettel". It has calm surfaces, a very
legible font and one expressive moment, which is crossing an item off. This
page explains the rules behind the look, so that later changes stay in the
same style. The values themselves live only in the `:root` blocks at the top
of `pb_public/app.css`; this page names them but does not repeat every one.

## Colors

The neutrals lean slightly towards the brand green, a sage grey instead of
the warm cream many apps use, so the background and the accent belong
together. The green of the app icon is the accent in light mode, which is
why the icons never need to be redrawn when colors change.

| Token | Role |
|---|---|
| `--bg` | the page behind the list |
| `--surface` | fields, buttons, the row in edit mode |
| `--raised` | layers above the page: the account menu, dialogs and suggestions |
| `--text` | item text and titles |
| `--muted` | meta lines, notes after the item text, checked-off items, secondary labels |
| `--line` | separators and borders |
| `--accent` | checking off and the primary button |
| `--claim` | the stripe and tint of a claimed item |
| `--notice` | messages in the status bar and the short highlight of a row that is already on the list |
| `--danger` | deleting and logging out |

Every color has a light and a dark value. Dark mode is designed, not
inverted: the accent is lighter and slightly toned down, and the claim tint
is stronger, because a faint tint disappears on a dark background.

Colors always carry a meaning. Blue means "someone gets this", green means
"done" or "the main action", red means "this removes something". No color
is used only for decoration.

All text reaches WCAG AA contrast against the page and against surfaces in
both modes, which is at least 4.5:1 for normal text. A test checks the
secondary texts, because they are the ones that drift below the limit.

## Type

The app uses Atkinson Hyperlegible Next, a font designed for legibility. It
tells I, l and 1 and O and 0 clearly apart, which matters for items like
"Milch 1l" or "Eier 10". The font is part of the app (`pb_public/vendor/`)
so it also works offline; the system font is the fallback.

| Role | Size and weight |
|---|---|
| App name | 28 px, extra bold, slightly tightened |
| Item text | 17 px, regular |
| Section headers and buttons | 15 to 16 px, semibold |
| Meta line | 14 px |
| Status bar | 12 px |

An item's note, such as the quantity in "Milch · 2x", follows the text in
the same size but in the muted color, after a middle dot. In a checked-off
row both are muted, and the dot still keeps them apart. A long note wraps
with the text instead of being cut off, because in the shop the note is
often the part that matters.

Labels are written in sentence case. Nothing is set in capitals.

## Shapes and depth

Corners are rounded by role, not with one radius everywhere: 12 px for
fields and buttons, 20 px for dialogs, the menu and cards, 8 px for the
checkbox. Only layers that float above the page cast a shadow, which means
the account menu, dialogs and the suggestions below the add field. Rows stay flat, without cards, and their
separators start where the text starts, which keeps the list calm.

Two bars frame the list and stay in place while it scrolls: the header at
the top, with the app name, the account menu and the add field, and the
status bar at the bottom. Both are translucent with a blur and a thin line
on the edge that faces the list, so the rows can be seen passing beneath
them. Neither casts a shadow, because they belong to the page rather than
floating above it. The header is based on the page color, while the status
bar is based on the surface color. The add field is drawn in the surface
color, so on a surface-colored header it would lose its edge.

The status bar is kept flat, because the header already takes room from the
list. It holds no buttons, so on phones with a home indicator its text may
reach into the area the system reserves at the bottom of the screen. It
keeps enough distance that it never touches the indicator.

The checkbox is drawn by the app instead of the browser, so it looks the
same on every platform. The native one shows as a black square in iOS dark
mode.

## Motion

Crossing an item off is the one expressive moment. The line is drawn across
the text from left to right, like a pen on paper. Everything else moves only
to show where something went: rows slide to their new place, the "Erledigt"
section opens with a turning chevron. Every animation is short, and all of
them are switched off when the device asks for reduced motion.

After the user checks off or un-checks an item, the row stays where it is
for about 1.5 seconds before it moves. Otherwise the next tap could land on
a different item that just slid under the finger.

## Interaction

The app must work one-handed on a phone and with mouse and keyboard on the
desktop. Every action therefore has a visible button. Gestures may be added
later only as shortcuts, and no control appears only on hover.

Text is never edited in a dialog fixed to the bottom of the screen, because
the phone keyboard covers it. Editing happens in the list, where the browser
scrolls the field above the keyboard by itself. Dialogs without text input,
such as the logout confirmation, open as sheets at the bottom on phones.

Buttons follow the platform order: the main action is on the right, cancel
next to it, and a destructive action stands apart on the left, as far away
from the thumb as possible.

## Do's and don'ts

- Do take colors, sizes and radii from the tokens in `app.css`; add a token
  when a new role appears.
- Do check new text colors in both modes against `--bg` and `--surface`.
- Don't add a second expressive animation; the crossing-off line is the one.
- Don't add shadows to rows or wrap list content in cards.
- Don't add colors without a meaning, or capitals for emphasis.
