#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRANDING_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$BRANDING_DIR")"
CONFIG="$BRANDING_DIR/config.json"

# Read config values
NAME=$(jq -r '.name' "$CONFIG")
NAME_SHORT=$(jq -r '.name_short' "$CONFIG")
NAME_SLUG=$(jq -r '.name_slug' "$CONFIG")
DESCRIPTION=$(jq -r '.description' "$CONFIG")
UPSTREAM_NAME=$(jq -r '.upstream_name' "$CONFIG")

# Mobile
BUNDLE_ID=$(jq -r '.mobile.bundle_id' "$CONFIG")
BUNDLE_ID_DEBUG=$(jq -r '.mobile.bundle_id_debug' "$CONFIG")
BUNDLE_ID_PROFILE=$(jq -r '.mobile.bundle_id_profile' "$CONFIG")
DEEP_LINK_SCHEME=$(jq -r '.mobile.deep_link_scheme' "$CONFIG")
OAUTH_CALLBACK=$(jq -r '.mobile.oauth_callback' "$CONFIG")
SHARED_GROUP=$(jq -r '.mobile.shared_group' "$CONFIG")
DOWNLOAD_DIR=$(jq -r '.mobile.download_dir' "$CONFIG")
BG_TASK_PREFIX=$(jq -r '.mobile.background_task_prefix' "$CONFIG")

# Docker
DOCKER_REGISTRY=$(jq -r '.docker.registry' "$CONFIG")
DOCKER_SERVER_IMAGE=$(jq -r '.docker.server_image' "$CONFIG")
DOCKER_ML_IMAGE=$(jq -r '.docker.ml_image' "$CONFIG")

# CLI
CLI_BIN_NAME=$(jq -r '.cli.bin_name' "$CONFIG")

# Docs
DOCS_TITLE=$(jq -r '.docs.title' "$CONFIG")
DOCS_URL=$(jq -r '.docs.url' "$CONFIG")

echo "=== Applying branding: $NAME ==="

#
# --- i18n ---
#
patch_i18n() {
  echo "--- Patching i18n strings ---"
  local overrides="$BRANDING_DIR/i18n/overrides-en.json"
  local target="$REPO_ROOT/i18n/en.json"

  if [[ -f "$overrides" ]]; then
    # Merge overrides into en.json (overrides take precedence)
    local tmp
    tmp=$(mktemp)
    jq -s '.[0] * .[1]' "$target" "$overrides" > "$tmp"
    mv "$tmp" "$target"
    echo "  Merged $(jq 'length' "$overrides") override keys into en.json"
  fi
}

#
# --- Web ---
#
patch_web() {
  echo "--- Patching web branding ---"

  # Page title in layout
  sed -i "s/- Immich<\/title>/- ${NAME}<\/title>/g" \
    "$REPO_ROOT/web/src/routes/+layout.svelte"

  # Noscript fallback in app.html
  sed -i "s/To use Immich,/To use ${NAME},/g" \
    "$REPO_ROOT/web/src/app.html"

  # manifest.json
  local manifest="$REPO_ROOT/web/static/manifest.json"
  if [[ -f "$manifest" ]]; then
    local tmp
    tmp=$(mktemp)
    jq --arg name "$NAME" --arg short "$NAME_SHORT" --arg desc "$DESCRIPTION" \
      '.name = $name | .short_name = $short | .description = $desc' \
      "$manifest" > "$tmp"
    mv "$tmp" "$manifest"
    echo "  Patched manifest.json"
  fi

  # OpenAPI spec
  local openapi="$REPO_ROOT/open-api/immich-openapi-specs.json"
  if [[ -f "$openapi" ]]; then
    local tmp
    tmp=$(mktemp)
    jq --arg name "$NAME" --arg desc "${NAME} API" \
      '.info.title = $name | .info.description = $desc' \
      "$openapi" > "$tmp"
    mv "$tmp" "$openapi"
    echo "  Patched OpenAPI spec"
  fi
}

#
# --- Assets ---
#
patch_assets() {
  echo "--- Overlaying brand assets ---"
  local assets="$BRANDING_DIR/assets"

  copy_if_exists() {
    local src="$1"
    shift
    if [[ -f "$src" ]]; then
      for dest in "$@"; do
        cp "$src" "$dest"
        echo "  $src -> $dest"
      done
    fi
  }

  # Favicons
  copy_if_exists "$assets/favicon.ico" \
    "$REPO_ROOT/web/static/favicon.ico" \
    "$REPO_ROOT/docs/static/img/favicon.ico"

  copy_if_exists "$assets/favicon.png" \
    "$REPO_ROOT/web/static/favicon.png" \
    "$REPO_ROOT/web/static/apple-icon-180.png" \
    "$REPO_ROOT/docs/static/img/favicon.png"

  # Sized favicons (generated from favicon.png if convert is available)
  if command -v convert &>/dev/null && [[ -f "$assets/favicon.png" ]]; then
    for size in 16 32 48 96 144; do
      convert "$assets/favicon.png" -resize "${size}x${size}" \
        "$REPO_ROOT/web/static/favicon-${size}.png"
    done
    echo "  Generated sized favicons"
  fi

  # PWA manifest icons
  copy_if_exists "$assets/app-icon.png" \
    "$REPO_ROOT/web/static/manifest-icon-192.maskable.png" \
    "$REPO_ROOT/web/static/manifest-icon-512.maskable.png"

  # Logo variants for web, docs, design, mobile
  copy_if_exists "$assets/logo-inline-light.svg" \
    "$REPO_ROOT/design/immich-logo-inline-light.svg" \
    "$REPO_ROOT/docs/static/img/immich-logo-inline-light.svg" \
    "$REPO_ROOT/mobile/assets/immich-logo-inline-light.svg"

  copy_if_exists "$assets/logo-inline-light.png" \
    "$REPO_ROOT/design/immich-logo-inline-light.png" \
    "$REPO_ROOT/docs/static/img/immich-logo-inline-light.png" \
    "$REPO_ROOT/mobile/assets/immich-logo-inline-light.png"

  copy_if_exists "$assets/logo-inline-dark.svg" \
    "$REPO_ROOT/design/immich-logo-inline-dark.svg" \
    "$REPO_ROOT/docs/static/img/immich-logo-inline-dark.svg" \
    "$REPO_ROOT/mobile/assets/immich-logo-inline-dark.svg"

  copy_if_exists "$assets/logo-inline-dark.png" \
    "$REPO_ROOT/design/immich-logo-inline-dark.png" \
    "$REPO_ROOT/docs/static/img/immich-logo-inline-dark.png" \
    "$REPO_ROOT/mobile/assets/immich-logo-inline-dark.png"

  copy_if_exists "$assets/logo-stacked-light.svg" \
    "$REPO_ROOT/design/immich-logo-stacked-light.svg" \
    "$REPO_ROOT/docs/static/img/immich-logo-stacked-light.svg"

  copy_if_exists "$assets/logo-stacked-light.png" \
    "$REPO_ROOT/design/immich-logo-stacked-light.png" \
    "$REPO_ROOT/docs/static/img/immich-logo-stacked-light.png"

  copy_if_exists "$assets/logo-stacked-dark.svg" \
    "$REPO_ROOT/design/immich-logo-stacked-dark.svg" \
    "$REPO_ROOT/docs/static/img/immich-logo-stacked-dark.svg"

  copy_if_exists "$assets/logo-stacked-dark.png" \
    "$REPO_ROOT/design/immich-logo-stacked-dark.png" \
    "$REPO_ROOT/docs/static/img/immich-logo-stacked-dark.png"

  # Mobile logo assets
  copy_if_exists "$assets/app-icon.png" \
    "$REPO_ROOT/mobile/assets/immich-logo.png" \
    "$REPO_ROOT/mobile/assets/immich-logo-w-bg.png" \
    "$REPO_ROOT/mobile/assets/immich-logo-w-bg-android.png" \
    "$REPO_ROOT/docs/static/img/color-logo.png"

  copy_if_exists "$assets/splash.png" \
    "$REPO_ROOT/mobile/assets/immich-splash.png" \
    "$REPO_ROOT/mobile/assets/immich-splash-android12.png"

  # Android drawable resources (all density buckets)
  for density in hdpi mdpi xhdpi xxhdpi xxxhdpi; do
    local res_dir="$REPO_ROOT/mobile/android/app/src/main/res/drawable-${density}"
    copy_if_exists "$assets/splash.png" "$res_dir/splash.png"
    copy_if_exists "$assets/splash.png" "$res_dir/android12splash.png"
    copy_if_exists "$assets/notification-icon.png" "$res_dir/notification_icon.png"

    # Night variants
    local night_dir="$REPO_ROOT/mobile/android/app/src/main/res/drawable-night-${density}"
    if [[ -d "$night_dir" ]]; then
      copy_if_exists "$assets/splash.png" "$night_dir/splash.png"
      copy_if_exists "$assets/splash.png" "$night_dir/android12splash.png"
    fi
  done

  # Android mipmap launcher icons
  for density in hdpi mdpi xhdpi xxhdpi xxxhdpi; do
    copy_if_exists "$assets/app-icon.png" \
      "$REPO_ROOT/mobile/android/app/src/main/res/mipmap-${density}/ic_launcher.png"
  done

  # Android adaptive icon foreground
  copy_if_exists "$assets/app-icon-adaptive-fg.png" \
    "$REPO_ROOT/mobile/assets/immich-logo-android-adaptive-icon.png"

  # Docs assets
  copy_if_exists "$assets/logo-mark.svg" \
    "$REPO_ROOT/docs/static/img/immich-logo.svg"
}
