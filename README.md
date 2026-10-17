# einkauf

A private shared shopping list for a family, built on [PocketBase](https://pocketbase.io/).

PocketBase runs as the standalone binary. The repository holds only what PocketBase loads at runtime:

| Directory        | Content                                         | In git |
|------------------|-------------------------------------------------|--------|
| `pb_public/`     | Static frontend (no build step)                 | yes    |
| `pb_hooks/`      | JS hooks (`*.pb.js`)                            | yes    |
| `pb_migrations/` | JS migrations, generated from schema changes    | yes    |
| `pb_data/`       | Database and uploads                            | no     |

## Local development

Prerequisites: [Nix](https://nixos.org/) with flakes enabled.

```sh
make dev            # start PocketBase on http://localhost:8090
make clean          # delete local data (pb_data/) to start fresh
make help           # list all targets
```

`make dev` runs the PocketBase version pinned in `flake.nix`, the same version that production uses.

- App: <http://localhost:8090/>
- Admin UI: <http://localhost:8090/_/>

On the first start, PocketBase prints a link to create the first superuser. Alternatively:

```sh
nix develop -c pocketbase superuser upsert you@example.com <password> --dir=./pb_data
```

Changes to files in `pb_public/` are visible after a browser reload. Changes in `pb_hooks/` restart the server automatically.

## Schema changes

1. Change collections in the **local** admin UI.
2. PocketBase writes a migration file to `pb_migrations/`.
3. Commit the migration together with the code that depends on it.
4. Production applies pending migrations on startup.

Never change the schema in the production admin UI. Production runs with `--automigrate=false`, so such changes would exist only in the production database and not in git.

## Deployment

Production runs with Docker Compose behind Traefik on the external `web` network, using the image `ghcr.io/muchobien/pocketbase`.

First deployment:

```sh
git clone <repo-url> einkauf && cd einkauf
cp .env.example .env    # set APP_HOST and secrets, chmod 600 .env
docker compose up -d
```

Update:

```sh
git pull && docker compose up -d
```

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
