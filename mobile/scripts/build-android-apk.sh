#!/usr/bin/env bash
# Build Android APK on the CI agent — no EAS. JS bundle embedded (release, no Metro).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${MOBILE_DIR}"

API_URL="${BACKEND_API_URL:-http://185.193.66.50:31847}"
BUILD_ID="${BUILD_BUILDID:-${BUILD_ID:-1}}"
OUTPUT_APK="${MOBILE_DIR}/agrotrack-mobile.apk"
BUILD_INFO="${MOBILE_DIR}/build-info.json"
GRADLE_LOG="${MOBILE_DIR}/gradle-build.log"

export EXPO_PUBLIC_API_URL="${API_URL}"
export EXPO_PUBLIC_SHOW_DEMO_LOGIN="${EXPO_PUBLIC_SHOW_DEMO_LOGIN:-true}"
export BUILD_ID
export API_URL
export NODE_ENV=production
export CI=1

log_gradle_failure() {
  echo "=== Gradle build failed ==="
  if [ -f "${GRADLE_LOG}" ]; then
    echo "--- Last 50 lines of gradle-build.log ---"
    tail -50 "${GRADLE_LOG}" || true
  fi
  if [ -f "android/app/build.gradle" ]; then
    echo "--- android/app/build.gradle (release block) ---"
    sed -n '/release\s*{/,/^\s*}/p' android/app/build.gradle 2>/dev/null | head -20 || true
  elif [ -f "android/app/build.gradle.kts" ]; then
    echo "--- android/app/build.gradle.kts (release block) ---"
    sed -n '/release\s*{/,/^\s*}/p' android/app/build.gradle.kts 2>/dev/null | head -20 || true
  fi
  echo "--- APK outputs under android/app/build/outputs ---"
  find android/app/build/outputs -name '*.apk' -type f 2>/dev/null || echo "(none)"
}

find_built_apk() {
  local apk
  apk="$(find app/build/outputs/apk -name '*.apk' -type f -printf '%T@ %p\n' 2>/dev/null \
    | sort -nr | head -1 | cut -d' ' -f2-)"
  if [ -z "${apk}" ]; then
    apk="$(find app/build/outputs/apk -name '*.apk' -type f 2>/dev/null | head -1)"
  fi
  printf '%s' "${apk}"
}

echo "Applying Android versionCode from pipeline build id: ${BUILD_ID}"
node <<'NODE'
const fs = require('fs');
const buildId = Math.max(1, parseInt(process.env.BUILD_ID || '1', 10));
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.expo.android = app.expo.android || {};
app.expo.android.versionCode = buildId;
fs.writeFileSync('app.json', JSON.stringify(app, null, 2) + '\n');
console.log('app version:', app.expo.version, 'versionCode:', buildId);
NODE

source "${SCRIPT_DIR}/setup-java.sh"
source "${SCRIPT_DIR}/setup-android-sdk.sh"

echo "JAVA_HOME=${JAVA_HOME}"
echo "ANDROID_HOME=${ANDROID_HOME}"
echo "Building release APK with embedded JS bundle (no Metro, no EAS)..."

rm -f "${OUTPUT_APK}" "${BUILD_INFO}" "${GRADLE_LOG}"
npx expo prebuild --platform android --clean --no-install
node "${SCRIPT_DIR}/patch-android-alpha-signing.js"

cd android
chmod +x gradlew
if ! ./gradlew assembleRelease --no-daemon -x lint -x test 2>&1 | tee "../${GRADLE_LOG}"; then
  cd "${MOBILE_DIR}"
  log_gradle_failure
  exit 1
fi

APK="$(find_built_apk)"
if [ -z "${APK}" ]; then
  cd "${MOBILE_DIR}"
  echo "ERROR: Gradle did not produce any APK under app/build/outputs/apk"
  log_gradle_failure
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
  echo "ERROR: Failed to copy APK to ${OUTPUT_APK}"
  ls -la "${MOBILE_DIR}" || true
  exit 1
fi

node <<'NODE'
const fs = require('fs');
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const info = {
  version: app.expo.version,
  versionCode: app.expo.android.versionCode,
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
