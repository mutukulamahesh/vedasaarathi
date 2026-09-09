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
