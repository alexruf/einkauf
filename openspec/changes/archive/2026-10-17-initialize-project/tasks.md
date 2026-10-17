# Tasks

## 1. Repository conventions

- [x] 1.1 Add a `context` entry to `openspec/config.yaml` stating that all repository content (code, comments, commits, specs, docs) is English and only the app UI is German; verify `openspec context --json` still resolves the root without errors
- [x] 1.2 Add `.gitignore` covering `pb_data/`, `.env`, `result` and `.direnv/`; verify `git check-ignore pb_data/x .env` lists both paths

## 2. Pinned PocketBase for local development

- [x] 2.1 Determine the latest PocketBase release that also exists as a `ghcr.io/muchobien/pocketbase` tag, and record it as the version to pin; verify the tag exists in the GHCR registry and the release exists on GitHub
- [x] 2.2 Add `flake.nix` with a dev shell that fetches the official release ZIP for that version on `aarch64-darwin`, `x86_64-darwin`, `x86_64-linux` and `aarch64-linux`, and generate `flake.lock`; verify `nix develop -c pocketbase --version` prints the pinned version
- [x] 2.3 Check the pinned version's flags with `nix develop -c pocketbase serve --help` (`--dir`, `--publicDir`, `--hooksDir`, `--migrationsDir`, `--automigrate`, `--encryptionEnv`) and update design.md if any differ

## 3. Project layout and local server

- [x] 3.1 Create `pb_hooks/` and `pb_migrations/` (with `.gitkeep`) and `pb_public/index.html` as a minimal German placeholder page (`lang="de"`); verify the files are tracked by `git status`
- [x] 3.2 Add a `Makefile` with a `help` target and a `dev` target that runs `pocketbase serve --dev` via the flake with explicit `--dir`, `--publicDir`, `--hooksDir` and `--migrationsDir` flags; verify that `make dev` serves the placeholder at `http://localhost:8090/` and the admin UI at `http://localhost:8090/_/`
- [x] 3.3 Verify the schema workflow end to end: create a throwaway collection in the local admin UI, confirm a migration file appears in `pb_migrations/`, then delete the collection and remove the generated files and the local `pb_data/` so nothing is committed
- [x] 3.4 Verify that editing `pb_public/index.html` while `make dev` runs is visible after a browser reload without a restart, and that `git status` shows neither `pb_data/` nor `.env`

## 4. Production configuration

- [x] 4.1 Read the `entrypoint.sh` of `ghcr.io/muchobien/pocketbase` for the pinned tag and confirm how extra command arguments reach `serve` and which directory flags it already sets; adjust the planned command in design.md if needed
- [x] 4.2 Add `compose.yaml` with the `einkauf` service: pinned image tag, `restart: unless-stopped`, external `web` network, mounts for `pb_data`, `pb_public`, `pb_hooks` and `pb_migrations`, command with `--encryptionEnv PB_ENCRYPTION_KEY`, `--automigrate=false` and `--migrationsDir /pb_migrations`, health check on `/api/health`, and Traefik labels named `einkauf` for the hostname from `APP_HOST`; verify `docker compose config` parses it without errors
- [x] 4.3 Add `.env.example` listing `APP_HOST`, `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD` and `PB_ENCRYPTION_KEY` (32 characters) with placeholder values and comments; verify every `$VAR` referenced in `compose.yaml` appears in `.env.example`

## 5. Version parity check

- [x] 5.1 Add a `check-version` Makefile target that compares the flake version with the `compose.yaml` image tag; verify it exits 0 on the committed files, and exits non-zero naming both versions after temporarily changing one pin (then revert)

## 6. Documentation

- [x] 6.1 Write `README.md` (English) covering prerequisites (Nix with flakes), `make dev`, first superuser setup, the schema/migration workflow and the rule never to edit the schema in production, deployment (clone, `.env`, `docker compose up -d`, update via `git pull`), and the version bump procedure (flake version and hashes, `compose.yaml` tag, `make check-version`); verify each documented local command runs as written

## 7. Deployment verification

- [x] 7.1 On the VPS: clone the repository, create `.env`, point DNS at the VPS, run `docker compose up -d`; verify the container reports healthy, `https://<hostname>/api/health` responds, and the German placeholder page loads with a valid certificate
- [x] 7.2 On the VPS: create a superuser-only test record, run `docker compose up -d --force-recreate`, and verify the data is still present; change a collection in the production admin UI and verify no new file appears in `pb_migrations/` (then revert the change)
- [x] 7.3 Verify that other apps behind the same reverse proxy are still reachable at their own hostnames after `einkauf` is deployed
