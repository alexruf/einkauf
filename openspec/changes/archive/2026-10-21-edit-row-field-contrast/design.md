# Design

## Context

Fields (`input[type="text"]`, `email`, `password`) and buttons are drawn in `--surface`. Three containers have a background of their own:

- the row in edit mode (`.item.is-editing`): `--surface` with a 1 px inset frame in `--line`;
- the login card (`.login form`): `--surface`;
- confirmation dialogs (`.confirm`): `--raised`.

In light mode `--surface` and `--raised` are both white. That makes fields and framed buttons invisible against all three containers in light mode, and against the edit row and the login card in dark mode too.

## Goals / Non-Goals

**Goals:**
- One rule for the whole app: a field or framed button always differs from the area it sits on, and the containers still stand out from the page.

**Non-Goals:**
- Changing tokens or colors elsewhere in the app.
- Changing layout or behavior of the edit mode, the login screen or dialogs.
- Frameless icon and text buttons (account button, more, claim, menu entries), which have no fill of their own.

## Decisions

**Containers keep their color; fields and non-primary buttons inside them take `--bg`.** The fields look recessed into the container. `--bg` differs from both `--surface` and `--raised` in both modes, so this works without a new token. Primary buttons keep their accent fill. The delete button in the edit row keeps its translucent danger tint, which already differs from the row. The "Abmelden" button in the dialog keeps its red frame and text and gets the recessed fill like "Abbrechen", so both buttons of the dialog look alike apart from their color.

The rule lives in one place in `app.css`, with a comment, listing the three containers. This keeps it visible as one design rule instead of three separate overrides.

Alternatives considered:
- *Draw the containers on `--bg`.* This was tried for the edit row: the fields stand out, but the whole row disappears into the list. It only moves the problem.
- *Draw the containers on `--raised`.* Does not help in light mode, where `--raised` is white like `--surface`.
- *A stronger field border.* This keeps the colors, but the fields look like a form and the containers stay flat.
- *A scoped custom property (`--control`) that containers override.* This is more general, but it adds indirection for three containers. The project keeps tokens in `:root` only.
- *A card with radius and shadow for the edit row.* This breaks the rule in `docs/design.md` that rows stay flat.

**Selectors with an element part.** The general rules `input[type="text"]` and so on are more specific than a single class. The override uses selectors such as `.login input` and comes after the general rules, so it wins without `!important`. For dialogs, `.confirm button:not(.primary)` leaves a possible primary button alone.

## Risks / Trade-offs

- [The recessed fields look different from the add field, which is surface on page] → the contexts differ: the add field sits on the page, the other fields sit inside a container. Each field differs from its own background, which is what the requirement asks for.
- [A future container with a surface or raised background must join the rule] → `docs/design.md` states the rule, and the e2e test names each container.
