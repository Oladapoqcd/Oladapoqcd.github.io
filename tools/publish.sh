#!/usr/bin/env bash
# Build, then swap preview/ in — but ONLY if the build actually produced a
# dist. A previous version deleted preview/ before checking, and a wiped
# node_modules turned a failed build into a deleted preview.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -d node_modules/vite ] || { echo "installing deps..."; npm install >/dev/null 2>&1; }

rm -rf dist
npx vite build >/tmp/build.log 2>&1 || { echo "BUILD FAILED — preview/ left untouched"; tail -20 /tmp/build.log; exit 1; }

[ -f dist/index.html ] || { echo "no dist/index.html — preview/ left untouched"; exit 1; }

rm -rf preview && cp -r dist preview
echo "published $(du -sh preview | cut -f1) to preview/"
ls preview/
