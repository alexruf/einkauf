# einkauf

A private shared shopping list for a family, built on [PocketBase](https://pocketbase.io/).

PocketBase runs as the standalone binary. The repository holds only what PocketBase loads at runtime:

| Directory        | Content                                           | In git |
|------------------|---------------------------------------------------|--------|
| `pb_public/`     | Static frontend (no build step)                   | yes    |
| `pb_hooks/`      | JS hooks (`*.pb.js`) and the modules they load    | yes    |
| `pb_migrations/` | JS migrations, the source of truth for the schema | yes    |
| `pb_data/`       | Database and uploads                              | no     |

## How the app works

Every family member logs in with their own account and sees the same shared list. Items can be added, edited, checked off and un-checked, and each item shows who added it and who changed it last. Checked-off items are deleted automatically 24 hours after they were checked off.

Before heading to a shop, a family member can claim an open item with the hand button, so the others know it is taken care of and nobody buys it twice. A claimed item gets a blue background and says who gets it. Anyone can remove a claim with the same button, and checking the item off removes it too. Claims nobody acts on expire after about three hours. Changes made by others appear live.

The app also works without a connection, which is common inside shops. It opens with the last known list, and items can be added, edited, checked off, un-checked and claimed offline. These changes are marked as not yet synchronized and are sent as soon as the connection returns. If two people change the same item, the change that reaches the server last wins. Deleting needs a connection.

Logging out removes the list and any unsent changes from the device. If only the session expired, unsent changes are kept until the same person logs in again. They are discarded if someone else logs in on that device, so they are never sent under the wrong name.

## Family accounts

There is no self-registration. The administrator creates one account per family member in the admin UI (`/_/`, collection **users**):

- **email** and **password**: what the person logs in with.
- **name**: the display name the app shows everywhere, for example "Mama". It is required, at most 30 characters long, and must not start or end with a space. The app never shows email addresses.
- **verified**: can stay off, because the app sends no emails.

Family members can see each other's display names but not their email addresses. Deleting an account keeps the items that person added; the app then shows "Unbekannt" as their author.

## App name

The name in the app's header and browser tab comes from **Application name** in the admin UI settings (`/_/`, Settings, Application). New installations start with "Einkauf". After a change, the app shows the new name the next time it starts. It remembers the last name it saw, so the name also stays correct offline.

The name under the icon of an installed app is a different thing. It comes from `pb_public/manifest.webmanifest`, and phones read it only once, when the app is added to the home screen.

## Installing the app on a phone

Open the app in the phone's browser, log in, and add it to the home screen. It then starts in its own window like a native app.

The login screen explains the same steps under "App installieren", so sending a new family member the link is enough. The hint disappears once the app runs from the home screen.

- **iPhone (Safari):** Share button, then "Zum Home-Bildschirm".
- **Android (Chrome):** menu, then "App installieren" or "Zum Startbildschirm hinzufügen".

On iPhones this matters for more than convenience. Safari deletes the stored data of websites that haven't been used for about seven days, including the offline copy of the list and any unsent changes. Apps added to the home screen are exempt from this.

## Local development

Prerequisites: [Nix](https://nixos.org/) with flakes enabled.

```sh
make dev            # start PocketBase on http://localhost:8090
make clean          # delete local data (pb_data/) to start fresh
make fmt            # format the code and apply safe lint fixes
make lint           # check formatting and lint without changing files
make help           # list all targets
make release        # create the next release locally (see Releases)
```

`make dev` runs the PocketBase version pinned in `flake.nix`, the same version that production uses.

- App: <http://localhost:8090/>
- Admin UI: <http://localhost:8090/_/>

`make dev` only listens on `localhost`, so other devices such as a phone cannot reach it. To try the app on a phone, start the server as described in [Manual checks on real phones](#manual-checks-on-real-phones).

When `pb_data/` is empty, PocketBase prints a link to create the first superuser. Data from an earlier session stays until you run `make clean`, and with it any superuser created back then, so the link does not appear again. The following command works in both cases: it creates the superuser, or sets a new password if one with that email already exists.

```sh
nix develop -c pocketbase superuser upsert you@example.com <password> --dir=./pb_data
```

Changes to files in `pb_public/` are visible after a browser reload. Changes in `pb_hooks/` restart the server automatically.

### Formatting and lint

[Biome](https://biomejs.dev/) formats and lints the JavaScript, CSS and JSON files, and [ShellCheck](https://www.shellcheck.net/) checks the scripts in `scripts/`. Both come from the Nix dev shell, like everything else. Run `make fmt` before committing; `make test` fails while `make lint` reports anything.

The rules are Biome's recommended set plus a check for undeclared variables. Without a build step, a misspelled name would otherwise only show up when the code runs, and in a hook that means on the server. Hooks and migrations run in PocketBase's own JavaScript runtime, so `biome.jsonc` lists the globals it provides. The list comes from `pb_data/types.d.ts`, which PocketBase generates for its version, so refresh it when upgrading PocketBase.

Migrations are linted but never reformatted, because a migration that already ran in production must stay exactly as it is. The vendored PocketBase SDK is skipped entirely.

The commit that first formatted the code with Biome is listed in `.git-blame-ignore-revs`, so `git blame` shows who last changed a line's content rather than that reformatting. GitHub and GitLab pick the file up on their own; for a local `git blame`, run this once:

```sh
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

## Tests

```sh
make test
```

This first runs `make lint`, then the unit and API tests with `node --test`, and then the browser tests with Playwright. Both tools come from the Nix dev shell, so there is no `npm install` and no `node_modules/`. The first run downloads Node, Playwright and its browsers into the Nix store, which takes a while.

The tests start their own PocketBase on a free port with a temporary data directory and delete it afterwards. You don't need `make dev` running, and your local `pb_data/` is never touched.

| Directory        | Content                                                     |
|------------------|-------------------------------------------------------------|
| `tests/unit/`    | Client logic from `pb_public/js/`, tested without a browser |
| `tests/api/`     | API rules, hooks and cleanup, tested with plain HTTP        |
| `tests/e2e/`     | Browser scenarios with Playwright                           |
| `tests/support/` | Helpers that start the test server and create test users    |

To run only one kind of test, for example while working on the API:

```sh
nix develop -c node --test "tests/api/**/*.test.mjs"
nix develop -c playwright test tests/e2e/login.spec.mjs
```

Playwright cannot be imported directly in test files, because the Nix package makes it available only to `require`. Browser tests import `test` and `expect` from `tests/support/e2e.mjs` instead, which also provides logged-in pages for Anna and Ben.

To take a page offline, use `goOffline` and `goOnline` from the same file. They cut a small proxy between that browser and the server. Chromium's own offline switch is not enough on its own: right after a reload it occasionally lets a request through while reporting it as failed, which made offline tests flaky.

## Manual checks on real phones

The automated tests run in desktop Chromium. They cannot cover Safari on iOS, installing to a real home screen, the phone keyboard, or a phone that loses its signal. Go through this list after changes to the frontend, with two phones (ideally one iPhone and one Android phone) logged in as different family members.

Offline support needs HTTPS, because browsers only run Service Workers on secure origins. A phone that opens `http://<your-laptop-ip>:8090` gets the app without offline support and cannot install it properly. Run the offline checks against the deployed instance. For the other checks, a local server reachable from the phone is enough:

```sh
nix develop -c pocketbase serve --http=0.0.0.0:8090 --dir=./pb_data --publicDir=./pb_public --hooksDir=./pb_hooks --migrationsDir=./pb_migrations
```

Checklist:

1. **Install:** in the browser, the login screen shows the collapsed hint "App installieren", and its steps match what the phone shows. Add the app to the home screen on both phones. It starts in its own window with the name "Einkauf" and the green basket icon, and its login screen no longer shows the install hint.
2. **Login:** a wrong password shows "E-Mail oder Passwort ist falsch."; after logging in, the header shows your display name and no email address appears anywhere.
3. **Live updates:** an item added on one phone appears on the other within a few seconds, with "von <name>". Checking it off shows "zuletzt <name>" on the other phone. Claiming an item with the hand button shows "<name> besorgt das" on a light blue background on the other phone, and "Du besorgst das" on a slightly stronger blue on your own.
4. **Phone layout:** the keyboard does not cover the input field; every button and row is easy to hit with a thumb; nothing scrolls sideways. Check light and dark mode.
5. **Airplane mode:** switch on airplane mode, close the app completely and open it from the home screen. The list appears with the offline hint. Add an item, edit one and check one off; all three are marked "nicht synchronisiert" and the delete buttons are disabled. Close and reopen the app; the changes are still there.
6. **Back online:** switch airplane mode off with the app open. Within a few seconds the marks disappear, and the other phone shows both changes.
7. **In a shop:** open the app where the signal is weak. The list appears after at most about three seconds.
8. **Logout:** log out, switch on airplane mode and open the app. Only the login screen appears, with no list.

## Schema changes

1. Change collections in the **local** admin UI, or write a migration in `pb_migrations/` by hand. The existing migrations are handwritten, so that rules and settings can be reviewed in one place.
2. When you use the admin UI, PocketBase writes the migration file to `pb_migrations/`.
3. Commit the migration together with the code that depends on it.
4. Production applies pending migrations on startup.

Never change the schema in the production admin UI. Production runs with `--automigrate=false`, so such changes would exist only in the production database and not in git.

## Deployment

Production runs with Docker Compose behind Traefik on the external `web` network, using the image `ghcr.io/muchobien/pocketbase`.

First deployment:

```sh
git clone <repo-url> einkauf && cd einkauf
git checkout v<version> # the release to run, see Releases below
cp .env.example .env    # set APP_HOST and PB_ENCRYPTION_KEY, chmod 600 .env
docker compose run --rm einkauf superuser upsert <email> <password> --dir=/pb_data --encryptionEnv=PB_ENCRYPTION_KEY
docker compose up -d
```

The second command creates the superuser for the admin UI. It must pass the encryption key, because PocketBase stores its settings encrypted. Start the command line with a space so the password does not end up in the shell history (in Bash, this works when `HISTCONTROL` contains `ignorespace`, which is the default on Debian and Ubuntu). The same command changes the password of an existing superuser.

PocketBase applies the migrations on startup. Then open `https://<APP_HOST>/_/`, log in as the superuser, and create the family accounts as described in [Family accounts](#family-accounts).

After the first deployment, check that the login rate limit tells devices apart. On one phone, using mobile data rather than your home Wi-Fi, log in with a wrong password eleven times within a minute until the app reports too many attempts. A second device on another network must still be able to log in. If it can't, the `X-Forwarded-For` header from Traefik doesn't reach PocketBase as expected, and every request seems to come from the same address. The trusted proxy setting is in `pb_migrations/1792264700_enable_rate_limits.js`; correct it with a new migration.

### Releases

Production runs releases, not whatever `main` points to at the moment. A release is a commit that sets the version, plus a Git tag `v<version>` on it. The version is the release date followed by a counter for the releases of that day: the first release on 19 October 2026 is `2026.10.19.0`, a second one on the same day `2026.10.19.1`. The status bar at the bottom of the app shows it, so you can tell which release a device runs.

Create a release on your development machine, on an up-to-date `main` without uncommitted changes:

```sh
make release
```

It writes the new version to `pb_public/js/version.js`, regenerates `CHANGELOG.md` from the commit messages with [git-cliff](https://git-cliff.org/), commits both as `chore(release): <version>`, and tags that commit. The tag's message holds the release notes. Nothing is pushed: check the commit and the changelog first, then run the push command the target prints, for example `git push origin main v2026.10.19.0`.

Don't change the version by hand, and never move or delete a tag that has been pushed; if a release turns out to be wrong, create a new one. A release that has not been pushed yet can be undone with `git tag -d v<version>` and `git reset --hard HEAD~1`.

The changelog is meant for the people who run and develop the app, so it is in English and lists only features, fixes, performance improvements, refactorings and documentation changes. It relies on commit messages following [Conventional Commits](https://www.conventionalcommits.org/).

### Update

On the server, check out the release to run:

```sh
git fetch --tags
git checkout v2026.10.19.0
docker compose up -d
docker compose restart einkauf
```

The clone then has no branch checked out ("detached HEAD"). That is intended, because production runs a release rather than a branch; `git pull` does not apply here.

`docker compose up -d` only recreates the container when `compose.yaml` changed. The restart is needed in every other case, because PocketBase loads hooks and applies migrations only when it starts; it does not watch for file changes in production. Check `docker compose logs einkauf` afterwards for errors.

Installed apps load the new frontend the next time they start with a connection; nobody has to clear caches.

To roll back, check out the tag of an earlier release and run the two `docker compose` commands from above again. If the rollback crosses a migration, revert that migration first, while the newer code is still checked out:

```sh
docker compose exec einkauf pocketbase migrate down 1 --dir=/pb_data --migrationsDir=/pb_migrations
```

Reverting the migration that creates the `items` collection deletes all list items.

Back up `pb_data/` in the deployment directory. It contains all application data.

## Upgrading PocketBase

The version is pinned in two places, which must always match:

1. `flake.nix`: set `version` and replace the four `sha256` values with those from the release's `checksums.txt` (`https://github.com/pocketbase/pocketbase/releases/download/v<version>/checksums.txt`).
2. `compose.yaml`: set the image tag `ghcr.io/muchobien/pocketbase:<version>`, after checking that the tag exists.

Then run:

```sh
make check-version  # fails if the two pins differ
nix develop -c pocketbase --version
```

Read the PocketBase changelog before upgrading. Pre-1.0 releases can contain breaking changes.

## License

[MIT](LICENSE)
