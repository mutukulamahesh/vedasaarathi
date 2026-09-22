#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${SITES_ENV_READY:-}" != "1" ]]; then
  exec "${script_dir}/sites-env.sh" -- "$0" "$@"
fi

command -v timeout || {
  echo "build-verified.sh requires GNU timeout." >&2
  exit 69
}

vinext="${SITES_PROJECT_ROOT}/node_modules/.bin/vinext"
if [[ ! -x "${vinext}" ]]; then
  echo "vinext is unavailable. Run npm run install:ci and wait for it to finish before building." >&2
  exit 69
fi

echo "Verifying the Panchanga release configuration..."
node "${script_dir}/verify-panchanga.mjs"

echo "Validating the app-hosted audio manifest..."
node "${script_dir}/validate-audio.mjs"

echo "Checking the third-party notices are current..."
node "${script_dir}/generate-third-party-notices.mjs" --check

echo "Recording the build's source commit..."
node "${script_dir}/generate-build-info.mjs"

# vinext build only emits dist/server/__vite_rsc_assets_manifest.js on a
# from-scratch build; an incremental build over an existing dist/ leaves
# dist/server/index.js importing a file that is not there. Always start clean.
rm -rf "${SITES_PROJECT_ROOT}/dist"

build_once() {
  timeout \
    --signal=TERM \
    --kill-after="${SITES_BUILD_KILL_AFTER:-10s}" \
    "${SITES_BUILD_TIMEOUT:-3m}" \
    "${vinext}" build
}

echo "Running bounded vinext build (pass 1 of 2)..."
build_once

echo "Generating the offline precache manifest..."
node "${script_dir}/generate-offline-manifest.mjs"

# The offline precache manifest has to be reachable as a real URL
# (/offline-manifest.json). vinext registers a route for a file only if it is in
# public/ when the build runs, so a second build is needed now that
# public/offline-manifest.json exists. A public/ file does not go through the
# bundler, so every asset hash — and therefore the URL list just generated —
# stays valid across the two passes.
echo "Rebuilding so the precache manifest is a served route (pass 2 of 2)..."
rm -rf "${SITES_PROJECT_ROOT}/dist"
build_once

echo "Refreshing the offline precache manifest against the final build..."
node "${script_dir}/generate-offline-manifest.mjs"

# Strip files that are only useful to the people preparing audio (per-clip
# transcript/hash/provenance sidecars and the source README) and Vite's own
# internal build bookkeeping (dist/client/.vite/manifest.json, unused at
# runtime and containing local build-machine paths) out of what actually gets
# deployed. The originals stay in public/audio/v1/ in the repository -
# nothing here touches the source, only the built dist/client output that
# Cloudflare's assets binding would otherwise publish as downloadable files.
echo "Removing internal build files from the deployable output..."
find "${SITES_PROJECT_ROOT}/dist/client/audio/v1" -maxdepth 1 \
  \( -name "*.txt" -o -name "*.sha256" -o -name "*.meta.json" -o -name "README.md" \) \
  -delete
rm -rf "${SITES_PROJECT_ROOT}/dist/client/.vite"
