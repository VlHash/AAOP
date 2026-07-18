#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root"

old_files=(
  ".github/workflows/build-openwrt.yml"
  ".github/workflows/oolite-ath79-port.yml"
  "port/patches/0001-oolite-ath79-current.patch"
  "port/patches/0001-oolite-ath79-port.patch"
  "CURRENT-PROGRESS.md"
  "README-oolite-port.md"
  "OPENFRP-SETUP.md"
)

for f in "${old_files[@]}"; do
  if [[ -e "$f" ]]; then
    rm -rf -- "$f"
    echo "removed old file: $f"
  fi
done

echo "AAOP M31 cleanup complete."
