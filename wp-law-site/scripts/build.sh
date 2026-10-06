#!/usr/bin/env bash
# Builds installable ZIP packages into dist/ from the source folders.
# Usage: scripts/build.sh            (run from wp-law-site/)
# Requires: zip, sha256sum. Excludes development files; packages contain no secrets.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd)
DIST="$ROOT/dist"
mkdir -p "$DIST"

version_of() { grep -m1 -E "^\s*\*?\s*Version:" "$1" | sed -E 's/.*Version:\s*//' | tr -d '\r '; }

build() { # $1 source dir, $2 slug, $3 header file
	local ver; ver=$(version_of "$1/$3")
	local tmp; tmp=$(mktemp -d)
	cp -R "$1" "$tmp/$2"
	find "$tmp/$2" \( -name ".DS_Store" -o -name "*.log" -o -name ".git*" -o -name "node_modules" -o -name "*.map" \) -prune -exec rm -rf {} +
	rm -f "$DIST/$2-$ver.zip"
	(cd "$tmp" && zip -qr -X "$DIST/$2-$ver.zip" "$2")
	rm -rf "$tmp"
	echo "built dist/$2-$ver.zip"
}

build themes/dadvar dadvar style.css
build themes/dadvar-child dadvar-child style.css
build plugins/dadvar-core dadvar-core dadvar-core.php

(cd "$DIST" && sha256sum *.zip > SHA256SUMS.txt)
echo "checksums: dist/SHA256SUMS.txt"
