# Proposal

## Why

The repository contains only OpenSpec tooling. Before any shopping-list features can be built, the project needs a reproducible local development setup and a deployment path to the existing VPS (Docker Compose behind Traefik), so that every later change can be developed, tested and shipped the same way.

## What Changes

- Add a Nix flake that provides a pinned PocketBase release for local development (`nix develop`).
- Add the PocketBase standalone project layout: `pb_public/` (static frontend), `pb_hooks/`, `pb_migrations/`, with `pb_data/` kept out of version control.
- Add a minimal German placeholder page in `pb_public/` so a running instance visibly serves the app.
- Add a production `compose.yaml` using `ghcr.io/muchobien/pocketbase` pinned to the same PocketBase version as the flake, attached to the external `web` network with Traefik labels named `einkauf`, and with automatic migration generation disabled.
- Add `.env.example` documenting required secrets (superuser credentials, settings encryption key); `.env` stays out of version control.
- Add a `Makefile` with entry points for common tasks (e.g. starting the dev server, checking that local and production PocketBase versions match).
- Add `.gitignore` and a `README.md` describing local development, the schema/migration workflow and deployment.
- Record the project language convention in `openspec/config.yaml`: everything in the repository is English, only the app UI is German.

Out of scope: shopping-list collections, authentication rules, the real frontend (Alpine.js, PocketBase JS SDK, PWA), backups, CI, and end-to-end tests.

## Capabilities

### New Capabilities
- `development-environment`: How a developer obtains the pinned backend, runs the app locally, and evolves the database schema through committed migrations.
- `deployment`: How the app runs in production on the VPS: version pinning, routing, persistence, secrets and migration behavior on startup.

### Modified Capabilities

None.

## Impact

- New files at the repository root: `flake.nix`, `flake.lock`, `compose.yaml`, `.env.example`, `.gitignore`, `Makefile`, `README.md`, `pb_public/`, `pb_hooks/`, `pb_migrations/`.
- `openspec/config.yaml` gains a `context` entry.
- New external dependencies: PocketBase (official release binary via Nix locally, `ghcr.io/muchobien/pocketbase` image in production).
- VPS: a new clone of this repository with its own `.env`, joining the existing `web` network; Traefik itself is unchanged.
