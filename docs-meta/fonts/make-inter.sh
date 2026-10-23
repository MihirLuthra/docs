#!/usr/bin/env bash
# Rebuilds apps/docs/static/fonts/inter-latin-wght-normal.woff2 (see README.md).
# Needs: npm, python3. Installs fonttools into a temporary venv.
set -euo pipefail

INTER_VERSION=5.3.0        # @fontsource-variable/inter
FONTTOOLS_VERSION=4.67.0
FEATURES=calt,ccmp,locl,kern,mark,mkmk,tnum
WEIGHTS=400:700

repo=$(cd "$(dirname "$0")/../.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cd "$work"

npm pack "@fontsource-variable/inter@$INTER_VERSION" --silent >/dev/null
tar xzf fontsource-variable-inter-*.tgz
python3 -m venv venv
venv/bin/pip install -q "fonttools[woff]==$FONTTOOLS_VERSION"

venv/bin/fonttools varLib.instancer package/files/inter-latin-wght-normal.woff2 \
  "wght=$WEIGHTS" -o narrow.ttf -q
venv/bin/pyftsubset narrow.ttf --unicodes='*' --layout-features="$FEATURES" \
  --no-hinting --flavor=woff2 --output-file=inter.woff2

cp inter.woff2 "$repo/apps/docs/static/fonts/inter-latin-wght-normal.woff2"
cp package/LICENSE "$repo/apps/docs/static/fonts/Inter-OFL.txt"
ls -l "$repo/apps/docs/static/fonts/inter-latin-wght-normal.woff2"
