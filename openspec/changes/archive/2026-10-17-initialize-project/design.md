# Design

## Context

The repository is greenfield (only OpenSpec tooling). See proposal.md for motivation. Constraints:

- Production runs on a VPS with Docker Compose. Traefik routes via labels on the external `web` network, with the `websecure` entrypoint and the `letsencrypt` cert resolver.
- Local development uses Nix.
- Operations must stay simple.
- PocketBase is pre-1.0. Minor releases have contained breaking changes, so the local and production versions must match.

## Goals / Non-Goals

**Goals:**
- Use one layout for dev and prod: the same `pb_public/`, `pb_hooks/` and `pb_migrations/` directories are used locally and mounted into the production container.
- Make deployment `git pull && docker compose up -d` in a clone of this repository.
- Change versions in one deliberate commit that a check guards.

**Non-Goals:**
- No custom Docker image and no CI pipeline.
- No Go code (PocketBase is not used as a framework).
- No frontend build tooling.
- No backup strategy (deferred to a later change).

## Decisions

### PocketBase standalone binary, not the Go framework
Extensions are JS hooks in `pb_hooks/`, and the schema lives in JS migrations in `pb_migrations/`.
- *Why:* The existing `ghcr.io/muchobien/pocketbase` image can be used as-is, and no image build is needed anywhere.
- *Alternative:* Go framework mode (better testability, single embedded binary). Rejected because it requires building and hosting a custom image, which conflicts with "operations as simple as possible".

### Local backend via a Nix flake that fetches the official release
`flake.nix` declares one `version` and per-platform hashes, and fetches the official PocketBase release ZIP for `aarch64-darwin`, `x86_64-darwin`, `x86_64-linux` and `aarch64-linux`. `nix develop` puts `pocketbase` on the `PATH`.
- *Why:* This gives exact version parity with the production image tag, and the flake can later supply further dev tools (e.g. Playwright).
- *Alternatives:* `pkgs.pocketbase` from nixpkgs (rejected: nixpkgs decides the version, so it drifts from the image tag); a download script into `./bin` (viable, but less reproducible).

### Explicit directory flags locally
The local start command passes `--dir=./pb_data --publicDir=./pb_public --hooksDir=./pb_hooks --migrationsDir=./pb_migrations` explicitly.
- *Why:* A prebuilt PocketBase binary resolves its default directories relative to the executable's location. With Nix that location is the read-only `/nix/store`, so the defaults would fail. Explicit flags also make the layout obvious.

### Production `compose.yaml` lives in this repository
There is one service, `einkauf`:
- the image is pinned to an exact tag (`ghcr.io/muchobien/pocketbase:<version>`), never `latest`
- volumes are `./pb_data`, `./pb_public`, `./pb_hooks` and `./pb_migrations`, mounted to `/pb_data`, `/pb_public`, `/pb_hooks` and `/pb_migrations` (read-only except `pb_data`)
- the command passes `--encryptionEnv PB_ENCRYPTION_KEY`, `--automigrate=false` and `--migrationsDir /pb_migrations`
- Traefik router and service names are `einkauf`, with the hostname read from `APP_HOST` in `.env`
- the `web` network is external
- *Why:* The image tag and the flake version change in the same commit, `.env` is isolated per app, and `docker compose` in this directory can only affect this app.
- *Alternative:* Add the service to a shared compose file on the VPS. Rejected because the image tag would live outside the repository and `.env` variables would be shared between apps.
- The hostname comes from `.env`, not from git, because the repository is public and should not reveal the production host.

### Schema workflow: admin UI locally, automigrate off in production
Locally, PocketBase's default automigrate writes a JS migration for every schema change made in the admin UI, and the developer commits it. Production applies pending migrations on `serve`, but never generates new ones.
- *Why:* Collections can be designed visually while schema changes stay versioned and reproducible.

### Version parity check in the Makefile
`make check-version` extracts the version from `flake.nix` and the image tag from `compose.yaml`. It exits non-zero and prints both values when they differ.
- *Why:* Bumping only one of the two pins is the most likely mistake. This turns it into a visible failure.

### Static placeholder frontend
`pb_public/index.html` is a minimal German page (`lang="de"`) with no JavaScript dependencies yet.
- *Why:* It proves the static-serving path in dev and prod. Alpine.js, the PocketBase SDK and the PWA files come with the first feature change.

### Makefile as the task entry point
The Makefile has `dev`, `check-version` and `help` targets.
- *Why:* It gives one discoverable place for commands, and `make` is available on macOS and the VPS without installing anything.

## Risks / Trade-offs

- [The muchobien entrypoint may not pass extra arguments through to `serve` as expected, or may handle `/pb_migrations` differently] → Verify against the image's `entrypoint.sh` before finalizing `compose.yaml`, and test it on the VPS. Fallback: rely on PocketBase's default `pb_data/../pb_migrations` = `/pb_migrations`.
- [`--automigrate` flag name or semantics differ in the pinned PocketBase version] → Verify with `pocketbase serve --help` for the pinned version.
- [Flake hashes must be updated for every platform on each version bump] → The flake uses the SHA-256 values from the release's `checksums.txt` as-is, so a bump is a copy-paste. Document the procedure in the README. The version check catches a forgotten `compose.yaml` bump.
- [Read-only mounts for hooks and migrations could interfere with PocketBase in production] → If PocketBase needs to write there despite automigrate being off, drop `:ro`, and note this in the README.
- [Superuser credentials in `.env` are re-applied on every start by the image] → This is accepted behavior of the image. Keep `.env` permissions restrictive on the VPS.
- [No backups yet] → Data lives in `./pb_data` in the clone and can be included in existing VPS backups until a dedicated change addresses backups.

## Migration Plan

1. On the VPS, clone the repository and create `.env` from `.env.example`.
2. Point DNS for the chosen hostname at the VPS.
3. Run `docker compose up -d`, then verify `/api/health` and the placeholder page over HTTPS.
4. Rollback: `docker compose down` in the clone. No other service is affected.

## Open Questions

- Exact PocketBase version to pin: resolved to `0.40.5` (latest GitHub release, also published as `ghcr.io/muchobien/pocketbase:0.40.5`).
- Production hostname: set per deployment via `APP_HOST` in `.env`, so it is not part of the repository.
