# Changelog

Notable changes per release, for the people who run and develop this app.
Versions are release dates with a counter for releases on the same day.

## 2026.10.19.1 (2026-10-19)

### Features

- **offline-sync:** Delete items through the outbox
- **item-suggestions:** Suggest past purchases while adding items
- **shopping-list:** Point at existing item instead of adding a duplicate
- **shopping-list:** Cancel edit on Escape when nothing has focus

### Bug Fixes

- **user-auth:** Cancel the token refresh when the session ends
- **offline-sync:** Stop sending changes a logout discarded
- **offline-sync:** Keep confirmed changes in the stored list
- **offline-sync:** Subscribe to item changes before the first reload
- **user-auth:** Follow logins and logouts from other tabs

### Documentation

- Collect open ideas in docs/ideas.md
## 2026.10.19.0 (2026-10-19)

### Bug Fixes

- **web-app:** Stop preselecting the cancel button in the logout sheet
- **user-auth:** Refuse every email the server would send
## 2026.10.18.4 (2026-10-18)

### Features

- **web-app:** Redesign list for one-handed use and legibility

### Bug Fixes

- **web-app:** Start offline after only the first visit
## 2026.10.18.3 (2026-10-18)

### Features

- **web-app:** Reload running apps after a new deployment
## 2026.10.18.2 (2026-10-18)

### Features

- **shopping-list:** Allow editing an item's text
- **shopping-list:** Let family members claim open items

### Bug Fixes

- **offline-sync:** Retry the realtime connection after a failed start

### Documentation

- **openspec:** Propose clearing all checked-off items at once
## 2026.10.18.1 (2026-10-18)

### Features

- Add shared shopping list with offline sync
- **web-app:** Explain app installation on the login screen
- **web-app:** Show the application name from PocketBase settings
- **web-app:** Add account menu, logout confirmation and status bar
- **deploy:** Add make release with changelog and release tags

### Bug Fixes

- **deploy:** Stop restart loop caused by encrypted settings
- **web-app:** Use neutral wording in the install hint
- **deploy:** Keep release tag signatures valid

### Documentation

- Add AGENTS.md with project context for coding agents
- Record manual checks and correct test command in docs
