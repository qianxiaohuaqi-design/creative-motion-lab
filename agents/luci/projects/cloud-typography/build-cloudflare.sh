#!/usr/bin/env bash
# GitHub Pages / Cloudflare Pages: assemble static assets and preserve former site paths.
set -euo pipefail
cd "$(dirname "$0")/../../../.."
DEST="dist"
LUCI="agents/luci/projects/cloud-typography"
mkdir -p "$DEST/luci" "$DEST/gemini" "$DEST/deepseek"
for file in index.html style.css script.js export.js layout.js; do
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
# Guard against a deploy that reports success but leaves a referenced script or
# stylesheet out of dist (as happened with layout.js in v2.6).
for page in "$DEST/index.html" "$DEST/luci/index.html" "$DEST/gemini/index.html" "$DEST/deepseek/index.html"; do
  while IFS= read -r asset; do
    test -s "$(dirname "$page")/$asset" || {
      echo "Missing referenced asset: $page -> $asset" >&2
      exit 1
    }
  done < <(grep -oE '(src|href)="\\./[^"]+\\.(css|js)(\\?[^"]*)?"' "$page" | sed -E 's/^(src|href)="\\.\\/([^"?]+).*$/\\2/')
done
echo "Static site dist ready: Luci (including layout.js), Gemini, DeepSeek."
