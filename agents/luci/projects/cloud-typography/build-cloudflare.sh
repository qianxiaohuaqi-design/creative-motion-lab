#!/usr/bin/env bash
# Cloudflare Pages: assemble public assets and preserve former site paths.
set -euo pipefail
cd "$(dirname "$0")/../../../.."
DEST="dist"
LUCI="agents/luci/projects/cloud-typography"
mkdir -p "$DEST/luci" "$DEST/gemini" "$DEST/deepseek"
for file in index.html style.css script.js export.js; do
  test -f "$LUCI/$file" || { echo "Missing Luci asset: $file" >&2; exit 1; }
  cp "$LUCI/$file" "$DEST/$file"
  cp "$LUCI/$file" "$DEST/luci/$file"
done
for agent in gemini deepseek; do
  SOURCE="agents/$agent/projects/cloud-typography"
  for file in index.html style.css script.js; do
    test -f "$SOURCE/$file" || { echo "Missing $agent asset: $file" >&2; exit 1; }
    cp "$SOURCE/$file" "$DEST/$agent/$file"
  done
done
for page in "$DEST/index.html" "$DEST/luci/index.html" "$DEST/gemini/index.html" "$DEST/deepseek/index.html"; do
  test -s "$page" || { echo "Empty site: $page" >&2; exit 1; }
done
echo "Cloudflare Pages dist ready: Luci with export.js, Gemini, DeepSeek."
