#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST_ROOT="$APP_ROOT/ChemVaultApp/Resources/Web"
ZH_SITE="${ZH_SITE:-/Users/edwardmu/ChemVault_suite/zh-ChemVault}"
EN_SITE="${EN_SITE:-/Users/edwardmu/ChemVault_suite/chemvault}"

build_and_copy() {
  local label="$1"
  local source_dir="$2"
  local dest_dir="$3"

  echo "==> Building $label site: $source_dir"
  if [ ! -d "$source_dir" ]; then
    echo "Missing source directory: $source_dir" >&2
    exit 1
  fi

  pushd "$source_dir" >/dev/null
  if [ -f package.json ]; then
    npm install
    if npm run | grep -qE '^  build$|^  build\s'; then
      npm run build
    else
      echo "No npm build script found for $label; using existing static files."
    fi
  fi

  local output=""
  if [ -d dist ]; then
    output="dist"
  elif [ -d build ]; then
    output="build"
  elif [ -d out ]; then
    output="out"
  elif [ -f index.html ]; then
    output="."
  else
    echo "No build output found for $label. Expected dist, build, out, or index.html." >&2
    exit 1
  fi

  echo "==> Copying $label bundle from $source_dir/$output to $dest_dir"
  rm -rf "$dest_dir"
  mkdir -p "$dest_dir"
  rsync -a --delete \
    --exclude node_modules \
    --exclude .git \
    --exclude .wrangler \
    --exclude .DS_Store \
    "$output/" "$dest_dir/"
  node "$APP_ROOT/scripts/normalize-web-bundle.mjs" "$dest_dir"
  popd >/dev/null

  if [ ! -f "$dest_dir/index.html" ]; then
    echo "Copied $label bundle is missing index.html: $dest_dir/index.html" >&2
    exit 1
  fi
}

build_and_copy "Chinese" "$ZH_SITE" "$DEST_ROOT/zh"
build_and_copy "International" "$EN_SITE" "$DEST_ROOT/en"

echo "==> Web bundles are ready:"
echo "    $DEST_ROOT/zh"
echo "    $DEST_ROOT/en"
