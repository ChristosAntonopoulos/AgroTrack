#!/usr/bin/env bash
# Build APK on agent and stage into frontend/public/downloads (atomic — do not split in CI).
set -euo pipefail

REPO_ROOT="${BUILD_SOURCESDIRECTORY:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APK_FILENAME="${APK_FILENAME:-olivecycle-alpha.apk}"
STAGED_APK="${REPO_ROOT}/frontend/public/downloads/${APK_FILENAME}"

export BUILD_SOURCESDIRECTORY="${REPO_ROOT}"
export APK_FILENAME

chmod +x "${SCRIPT_DIR}/setup-java.sh" \
  "${SCRIPT_DIR}/setup-android-sdk.sh" \
  "${SCRIPT_DIR}/build-android-apk.sh"

echo "=== Build + stage APK (repo: ${REPO_ROOT}) ==="
"${SCRIPT_DIR}/build-android-apk.sh"

CANONICAL_APK="${REPO_ROOT}/mobile/agrotrack-mobile.apk"
if [ ! -f "${CANONICAL_APK}" ]; then
  echo "ERROR: Build finished but APK missing at ${CANONICAL_APK}"
  ls -la "${REPO_ROOT}/mobile/" || true
  exit 1
fi

node "${SCRIPT_DIR}/stage-apk-for-frontend.js"

if [ ! -f "${STAGED_APK}" ]; then
  echo "ERROR: Staged APK missing at ${STAGED_APK}"
  ls -la "${REPO_ROOT}/frontend/public/downloads/" || true
  exit 1
fi

echo "=== Build + stage complete ==="
ls -lh "${CANONICAL_APK}" "${STAGED_APK}"
if [ -f "${REPO_ROOT}/frontend/public/downloads/latest.json" ]; then
  cat "${REPO_ROOT}/frontend/public/downloads/latest.json"
fi
