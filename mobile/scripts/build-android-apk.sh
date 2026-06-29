#!/usr/bin/env bash
# Build Android APK on the CI agent — no EAS. Served from frontend /downloads/.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${MOBILE_DIR}"

API_URL="${BACKEND_API_URL:-http://185.193.66.50:31847}"
BUILD_ID="${BUILD_BUILDID:-${BUILD_ID:-1}}"
OUTPUT_APK="${MOBILE_DIR}/agrotrack-mobile.apk"
BUILD_INFO="${MOBILE_DIR}/build-info.json"

export EXPO_PUBLIC_API_URL="${API_URL}"
export EXPO_PUBLIC_SHOW_DEMO_LOGIN="${EXPO_PUBLIC_SHOW_DEMO_LOGIN:-true}"
export BUILD_ID
export API_URL

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
echo "Building APK with Gradle (agent build, no EAS)..."

rm -f "${OUTPUT_APK}" "${BUILD_INFO}"
npx expo prebuild --platform android --clean --no-install

cd android
chmod +x gradlew
./gradlew assembleDebug --no-daemon -x lint -x test

APK="$(find app/build/outputs/apk/debug -name '*.apk' -type f | head -1)"
if [ -z "${APK}" ]; then
  echo "ERROR: Gradle did not produce a debug APK"
  exit 1
fi

cp "${APK}" "${OUTPUT_APK}"
cd "${MOBILE_DIR}"

node <<'NODE'
const fs = require('fs');
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const info = {
  version: app.expo.version,
  versionCode: app.expo.android.versionCode,
  buildId: String(process.env.BUILD_ID || ''),
  builtAt: new Date().toISOString(),
  builder: 'gradle-agent',
  apiUrl: process.env.API_URL,
};
fs.writeFileSync('build-info.json', JSON.stringify(info, null, 2) + '\n');
console.log('Build info:', JSON.stringify(info));
NODE

echo "APK ready: ${OUTPUT_APK} ($(du -h "${OUTPUT_APK}" | cut -f1))"
ls -lh "${OUTPUT_APK}"
