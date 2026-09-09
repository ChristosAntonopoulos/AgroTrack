#!/usr/bin/env bash
# Build Android APK on the CI agent — no EAS. JS bundle embedded (release, no Metro).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ANDROID_DIR="${MOBILE_DIR}/android"
GRADLE_APK_ROOT="${ANDROID_DIR}/app/build/outputs/apk"
cd "${MOBILE_DIR}"

API_URL="${BACKEND_API_URL:-http://185.193.66.50:31847}"
BUILD_ID="${BUILD_BUILDID:-${BUILD_ID:-1}}"
OUTPUT_APK="${MOBILE_DIR}/oleachron-mobile.apk"
BUILD_INFO="${MOBILE_DIR}/build-info.json"
GRADLE_LOG="${MOBILE_DIR}/gradle-build.log"

# Standard AGP APK locations (newest / preferred first).
GRADLE_APK_CANDIDATES=(
  "${GRADLE_APK_ROOT}/release/app-release.apk"
  "${GRADLE_APK_ROOT}/release/app-release-unsigned.apk"
  "${GRADLE_APK_ROOT}/debug/app-debug.apk"
)

export EXPO_PUBLIC_API_URL="${API_URL}"
export EXPO_PUBLIC_SHOW_DEMO_LOGIN="${EXPO_PUBLIC_SHOW_DEMO_LOGIN:-true}"
export BUILD_ID
export API_URL
export NODE_ENV=production
export CI=1
export ORG_GRADLE_OPTS="${ORG_GRADLE_OPTS:--Xmx4g -Dorg.gradle.daemon=true -Dorg.gradle.caching=true}"

log_gradle_failure() {
  echo "=== Gradle build failed (exit ${GRADLE_EXIT_STATUS:-unknown}) ==="
  if [ -f "${GRADLE_LOG}" ]; then
    echo "--- Last 50 lines of gradle-build.log ---"
    tail -50 "${GRADLE_LOG}" || true
  fi
  if [ -f "${ANDROID_DIR}/app/build.gradle" ]; then
    echo "--- android/app/build.gradle (release block) ---"
    sed -n '/release\s*{/,/^\s*}/p' "${ANDROID_DIR}/app/build.gradle" 2>/dev/null | head -20 || true
  elif [ -f "${ANDROID_DIR}/app/build.gradle.kts" ]; then
    echo "--- android/app/build.gradle.kts (release block) ---"
    sed -n '/release\s*{/,/^\s*}/p' "${ANDROID_DIR}/app/build.gradle.kts" 2>/dev/null | head -20 || true
  fi
  list_apk_outputs
}

log_apk_discovery_failure() {
  echo "=== Gradle succeeded but APK was not found or copied ==="
  echo "Expected canonical output: ${OUTPUT_APK}"
  echo "Checked standard Gradle paths:"
  local candidate
  for candidate in "${GRADLE_APK_CANDIDATES[@]}"; do
    if [ -f "${candidate}" ]; then
      echo "  [exists] ${candidate}"
    else
      echo "  [missing] ${candidate}"
    fi
  done
  list_apk_outputs
}

list_apk_outputs() {
  echo "--- APK outputs under android/app/build/outputs ---"
  if [ -d "${ANDROID_DIR}/app/build/outputs" ]; then
    find "${ANDROID_DIR}/app/build/outputs" -name '*.apk' -type f 2>/dev/null || echo "(none)"
  else
    echo "(directory missing: ${ANDROID_DIR}/app/build/outputs)"
  fi
}

find_built_apk() {
  local candidate apk

  for candidate in "${GRADLE_APK_CANDIDATES[@]}"; do
    if [ -f "${candidate}" ]; then
      printf '%s' "${candidate}"
      return 0
    fi
  done

  if [ -d "${GRADLE_APK_ROOT}" ]; then
    # GNU find: pick newest by mtime; POSIX fallback below if -printf is unavailable.
    apk="$(find "${GRADLE_APK_ROOT}" -name '*.apk' -type f -printf '%T@ %p\n' 2>/dev/null \
      | sort -nr | head -1 | cut -d' ' -f2- || true)"
    if [ -n "${apk}" ] && [ -f "${apk}" ]; then
      printf '%s' "${apk}"
      return 0
    fi

    apk="$(find "${GRADLE_APK_ROOT}" -name '*.apk' -type f 2>/dev/null | head -1 || true)"
    if [ -n "${apk}" ] && [ -f "${apk}" ]; then
      printf '%s' "${apk}"
      return 0
    fi
  fi

  return 1
}

# Stamp native inputs only — never include pipeline versionCode (it changes every run).
compute_prebuild_stamp() {
  node <<'NODE'
const crypto = require('crypto');
const fs = require('fs');
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const hash = crypto.createHash('sha256');
hash.update(fs.readFileSync('package.json'));
hash.update(fs.readFileSync('package-lock.json'));
hash.update(JSON.stringify(app.expo.plugins || []));
hash.update(fs.readFileSync('app.config.js'));
hash.update('ci-skip-dev-client:1');
console.log(hash.digest('hex'));
NODE
}

source "${SCRIPT_DIR}/setup-java.sh"
source "${SCRIPT_DIR}/setup-android-sdk.sh"

echo "JAVA_HOME=${JAVA_HOME}"
echo "ANDROID_HOME=${ANDROID_HOME}"
echo "GRADLE_USER_HOME=${GRADLE_USER_HOME:-"(default)"}"
echo "ORG_GRADLE_OPTS=${ORG_GRADLE_OPTS}"
echo "Building release APK with embedded JS bundle (no Metro, no EAS)..."
echo "Pipeline versionCode (applied after prebuild): ${BUILD_ID}"

rm -f "${OUTPUT_APK}" "${BUILD_INFO}" "${GRADLE_LOG}"

PREBUILD_STAMP="${ANDROID_DIR}/.oleachron-prebuild-stamp"
CURRENT_STAMP="$(compute_prebuild_stamp)"

# Exclude expo-dev-client from Gradle for this release build only.
# Restore package.json afterward so the agent workspace stays clean between runs.
node "${SCRIPT_DIR}/apply-ci-autolinking-exclude.js"

PREBUILD_START="$(date +%s)"
if [ ! -d "${ANDROID_DIR}" ] || [ ! -x "${ANDROID_DIR}/gradlew" ] || [ ! -f "${PREBUILD_STAMP}" ] || [ "$(cat "${PREBUILD_STAMP}")" != "${CURRENT_STAMP}" ]; then
  echo "Native project missing or Expo plugins changed — expo prebuild --clean"
  npx expo prebuild --platform android --clean --no-install
  echo "${CURRENT_STAMP}" > "${PREBUILD_STAMP}"
else
  echo "Reusing android/ — expo prebuild without --clean"
  npx expo prebuild --platform android --no-install
fi
echo "Prebuild finished in $(( $(date +%s) - PREBUILD_START ))s"
git checkout -- package.json 2>/dev/null || true

node "${SCRIPT_DIR}/patch-android-alpha-signing.js"
node "${SCRIPT_DIR}/patch-android-version-code.js"

cd "${ANDROID_DIR}"
chmod +x gradlew
GRADLE_START="$(date +%s)"
set +e
./gradlew assembleRelease --build-cache --parallel -x lint -x test 2>&1 | tee "${GRADLE_LOG}"
GRADLE_EXIT_STATUS="${PIPESTATUS[0]}"
set -e
echo "Gradle assembleRelease finished in $(( $(date +%s) - GRADLE_START ))s (exit ${GRADLE_EXIT_STATUS})"

if [ "${GRADLE_EXIT_STATUS}" -ne 0 ]; then
  cd "${MOBILE_DIR}"
  log_gradle_failure
  exit 1
fi

if ! APK="$(find_built_apk)"; then
  cd "${MOBILE_DIR}"
  log_apk_discovery_failure
  exit 1
fi

echo "Gradle APK: ${APK} ($(du -h "${APK}" | cut -f1))"
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "${APK}"
elif command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "${APK}"
fi

cp "${APK}" "${OUTPUT_APK}"
cd "${MOBILE_DIR}"

if [ ! -f "${OUTPUT_APK}" ]; then
  echo "ERROR: Failed to copy APK from ${APK} to ${OUTPUT_APK}"
  ls -la "${MOBILE_DIR}" || true
  exit 1
fi

node <<'NODE'
const fs = require('fs');
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const buildId = Math.max(1, parseInt(process.env.BUILD_ID || '1', 10));
const info = {
  version: app.expo.version,
  versionCode: buildId,
  buildId: String(process.env.BUILD_ID || ''),
  builtAt: new Date().toISOString(),
  builder: 'gradle-agent-release',
  apiUrl: process.env.API_URL,
};
fs.writeFileSync('build-info.json', JSON.stringify(info, null, 2) + '\n');
console.log('Build info:', JSON.stringify(info));
NODE

echo "APK ready: ${OUTPUT_APK} ($(du -h "${OUTPUT_APK}" | cut -f1))"
ls -lh "${OUTPUT_APK}"
