#!/usr/bin/env bash
# Build AgroTrack Android APK for CI: EAS cloud, then local EAS, then Gradle fallback.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${MOBILE_DIR}"

API_URL="${BACKEND_API_URL:-http://185.193.66.50:31847}"
STRATEGY="${BUILD_STRATEGY:-cloud-then-local}"
OUTPUT_APK="${MOBILE_DIR}/agrotrack-mobile.apk"

export EXPO_PUBLIC_API_URL="${API_URL}"
export EXPO_PUBLIC_SHOW_DEMO_LOGIN="${EXPO_PUBLIC_SHOW_DEMO_LOGIN:-true}"
export EAS_BUILD_NO_EXPO_GO_WARNING=true

rm -f "${OUTPUT_APK}"

collect_apk() {
  local apk
  apk="$(find "${MOBILE_DIR}" -maxdepth 3 -name '*.apk' -type f ! -path '*/node_modules/*' -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -1 | cut -d' ' -f2-)"
  if [ -z "${apk}" ]; then
    apk="$(find "${MOBILE_DIR}" -maxdepth 3 -name '*.apk' -type f ! -path '*/node_modules/*' | head -1)"
  fi
  if [ -z "${apk}" ] || [ ! -f "${apk}" ]; then
    echo "ERROR: No APK artifact found after build"
    return 1
  fi
  cp "${apk}" "${OUTPUT_APK}"
  echo "APK ready: ${OUTPUT_APK} ($(du -h "${OUTPUT_APK}" | cut -f1))"
  ls -lh "${OUTPUT_APK}"
}

try_eas_cloud() {
  echo "=== EAS cloud build (production) ==="
  if ! EXPO_PUBLIC_API_URL="${API_URL}" \
    EXPO_PUBLIC_SHOW_DEMO_LOGIN="${EXPO_PUBLIC_SHOW_DEMO_LOGIN}" \
    eas build --platform android --profile production --non-interactive --wait --json > eas-build-output.json 2>eas-build-stderr.log; then
    echo "EAS cloud build failed. stderr tail:"
    tail -40 eas-build-stderr.log || true
    return 1
  fi

  node <<'NODE'
const fs = require('fs');
const raw = fs.readFileSync('eas-build-output.json', 'utf8').trim();
const jsonStart = raw.search(/[\[{]/);
if (jsonStart < 0) throw new Error('No JSON in EAS output');
const parsed = JSON.parse(raw.slice(jsonStart));
const build = Array.isArray(parsed) ? parsed[0] : parsed;
if (!build?.id) throw new Error('Missing build id');
if (String(build.status || '').toUpperCase() !== 'FINISHED') {
  throw new Error(`Build status: ${build.status}`);
}
const artifactUrl =
  build.artifacts?.buildUrl ||
  build.artifacts?.applicationArchiveUrl ||
  null;
fs.writeFileSync('eas-build-id.txt', build.id);
if (artifactUrl) fs.writeFileSync('eas-artifact-url.txt', artifactUrl);
console.log(`Cloud build ${build.id} finished`);
NODE

  if [ -f eas-artifact-url.txt ]; then
    curl -fsSL "$(cat eas-artifact-url.txt)" -o "${OUTPUT_APK}"
  else
    eas build:download --build-id "$(cat eas-build-id.txt)" --non-interactive
    collect_apk
  fi
}

try_eas_local() {
  echo "=== EAS local build (production, uses remote signing credentials) ==="
  # Local EAS builds do not consume cloud build quota.
  source "${SCRIPT_DIR}/setup-android-sdk.sh"

  EXPO_PUBLIC_API_URL="${API_URL}" \
  EXPO_PUBLIC_SHOW_DEMO_LOGIN="${EXPO_PUBLIC_SHOW_DEMO_LOGIN}" \
    eas build --platform android --profile production --local --non-interactive

  collect_apk
}

try_gradle_local() {
  echo "=== Gradle local build fallback ==="
  source "${SCRIPT_DIR}/setup-android-sdk.sh"

  export NODE_ENV=production
  npx expo prebuild --platform android --clean --no-install

  cd android
  chmod +x gradlew
  if ! ./gradlew assembleRelease --no-daemon -x lint -x test; then
    echo "Release build failed (likely signing) — building debug APK for alpha..."
    ./gradlew assembleDebug --no-daemon -x lint -x test
    cd ..
    APK="$(find android/app/build/outputs/apk/debug -name '*.apk' -type f | head -1)"
  else
    cd ..
    APK="$(find android/app/build/outputs/apk/release -name '*.apk' -type f | head -1)"
  fi
  if [ -z "${APK}" ]; then
    echo "ERROR: Gradle did not produce a release APK"
    exit 1
  fi
  cp "${APK}" "${OUTPUT_APK}"
  ls -lh "${OUTPUT_APK}"
}

should_fallback() {
  if [ ! -f eas-build-stderr.log ]; then
    return 0
  fi
  if grep -qiE 'free plan|build command failed|quota|billing|used its android builds' eas-build-stderr.log; then
    echo "Detected EAS cloud quota/billing limit — switching to local build."
    return 0
  fi
  return 0
}

run_cloud() {
  try_eas_cloud
}

run_local() {
  try_eas_local || try_gradle_local
}

case "${STRATEGY}" in
  cloud)
    run_cloud
    ;;
  local)
    run_local
    ;;
  cloud-then-local|*)
    if ! run_cloud; then
      should_fallback
      run_local
    fi
    ;;
esac

if [ ! -f "${OUTPUT_APK}" ]; then
  echo "ERROR: APK was not produced"
  exit 1
fi
