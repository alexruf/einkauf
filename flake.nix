{
  description = "einkauf - shared family shopping list on PocketBase";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs = { self, nixpkgs }:
    let
      # Must match the image tag in compose.yaml (checked by `make check-version`).
      version = "0.40.5";

      # SHA-256 of the release ZIPs, copied from the release's checksums.txt.
      releases = {
        aarch64-darwin = { platform = "darwin_arm64"; sha256 = "d9a176e0491bc825fff88c2a4edffb07307f785ac2bd9710e82c5d223669fc17"; };
        x86_64-darwin = { platform = "darwin_amd64"; sha256 = "3640f0c4d9e0e5a47e321f10ddf6698508d4f20721bcf5dfb7c4192835e5105f"; };
        x86_64-linux = { platform = "linux_amd64"; sha256 = "1dbea1b01eb3dfe64953513859d01e759c96650c4e3264fa4eecd54b769382e4"; };
        aarch64-linux = { platform = "linux_arm64"; sha256 = "570baa1c45d2fb92fc0073582b945ca0ece03cbf9837ccabf49a222f99dd02e3"; };
      };

      forAllSystems = f: nixpkgs.lib.genAttrs (builtins.attrNames releases)
        (system: f system nixpkgs.legacyPackages.${system});

      mkPocketbase = system: pkgs:
        let release = releases.${system}; in
        pkgs.stdenvNoCC.mkDerivation {
          pname = "pocketbase";
          inherit version;
          src = pkgs.fetchurl {
            url = "https://github.com/pocketbase/pocketbase/releases/download/v${version}/pocketbase_${version}_${release.platform}.zip";
            inherit (release) sha256;
          };
          nativeBuildInputs = [ pkgs.unzip ];
          sourceRoot = ".";
          installPhase = ''
            install -Dm755 pocketbase $out/bin/pocketbase
          '';
        };
    in
    {
      packages = forAllSystems (system: pkgs: {
        pocketbase = mkPocketbase system pkgs;
        default = self.packages.${system}.pocketbase;
      });

      devShells = forAllSystems (system: pkgs: {
        default = pkgs.mkShellNoCC {
          packages = [
            self.packages.${system}.pocketbase
            pkgs.gnumake
            # Generates CHANGELOG.md from the commit history in `make release`.
            pkgs.git-cliff
            # Test tooling: `node --test` for API and client logic, Playwright for browser tests.
            pkgs.nodejs
            pkgs.playwright-test
            # Lint and formatting for the JS/CSS/JSON files (`make lint`, `make fmt`).
            pkgs.biome
            # Lint for the shell scripts in scripts/.
            pkgs.shellcheck
          ];
          # Use the browsers built for the same nixpkgs Playwright release instead of downloading them.
          PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright-driver.browsers}";
        };
      });
    };
}
