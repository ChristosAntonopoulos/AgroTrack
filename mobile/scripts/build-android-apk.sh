#!/usr/bin/env bash
# Build Android APK on the CI agent (no EAS cloud quota, no eas build --local).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${MOBILE_DIR}"

API_URL="${BACKEND_API_URL:-http://185.193.66.50:31847}"
OUTPUT_APK="${MOBILE_DIR}/agrotrack-mobile.apk"

export EXPO_PUBLIC_API_URL="${API_URL}"
export EXPO_PUBLIC_SHOW_DEMO_LOGIN="${EXPO_PUBLIC_SHOW_DEMO_LOGIN:-true}"

source "${SCRIPT_DIR}/setup-java.sh"
source "${SCRIPT_DIR}/setup-android-sdk.sh"

echo "JAVA_HOME=${JAVA_HOME}"
echo "ANDROID_HOME=${ANDROID_HOME}"
echo "Building alpha APK with Gradle (debug, no EAS required)..."

rm -f "${OUTPUT_APK}"
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
echo "APK ready: ${OUTPUT_APK} ($(du -h "${OUTPUT_APK}" | cut -f1))"
ls -lh "${OUTPUT_APK}"
