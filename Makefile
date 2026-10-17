.DEFAULT_GOAL := help

PB_FLAGS := --dir=./pb_data --publicDir=./pb_public --hooksDir=./pb_hooks --migrationsDir=./pb_migrations

.PHONY: help
help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  %-15s %s\n", $$1, $$2}'

.PHONY: dev
dev: ## Start PocketBase locally in dev mode on http://localhost:8090
	nix develop -c pocketbase serve --dev $(PB_FLAGS)

.PHONY: clean
clean: ## Delete local runtime data (pb_data/) and Nix build links; keeps migrations
	rm -rf ./pb_data ./result

.PHONY: test
test: ## Run all automated tests against a temporary PocketBase instance
	nix develop -c node --test "tests/unit/**/*.test.mjs" "tests/api/**/*.test.mjs"
	nix develop -c playwright test

.PHONY: check-version
check-version: ## Fail if flake.nix and compose.yaml pin different PocketBase versions
	@flake=$$(sed -nE 's/^ *version = "([^"]+)";.*/\1/p' flake.nix); \
	compose=$$(sed -nE 's|^ *image: ghcr.io/muchobien/pocketbase:([^ ]+).*|\1|p' compose.yaml); \
	if [ -z "$$flake" ] || [ -z "$$compose" ]; then \
		echo "Could not read versions (flake.nix: '$$flake', compose.yaml: '$$compose')"; exit 1; \
	fi; \
	if [ "$$flake" != "$$compose" ]; then \
		echo "PocketBase version mismatch: flake.nix=$$flake compose.yaml=$$compose"; exit 1; \
	fi; \
	echo "PocketBase version $$flake pinned in flake.nix and compose.yaml"
