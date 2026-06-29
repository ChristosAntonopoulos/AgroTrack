#!/usr/bin/env bash
# Idempotent Android SDK setup for local APK builds on Linux CI agents (no sudo).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=setup-java.sh
source "${SCRIPT_DIR}/setup-java.sh"

export ANDROID_HOME="${ANDROID_HOME:-${HOME}/.agrotrack/android-sdk}"
export ANDROID_SDK_ROOT="${ANDROID_HOME}"
export PATH="${PATH}:${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/cmdline-tools/latest/bin"

unzip_archive() {
  local archive="$1"
  local dest="$2"
  if command -v unzip >/dev/null 2>&1; then
    unzip -q -o "${archive}" -d "${dest}"
    return 0
  fi
  if command -v python3 >/dev/null 2>&1; then
    python3 - <<'PY' "${archive}" "${dest}"
import sys, zipfile
zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])
PY
    return 0
  fi
  echo "ERROR: need unzip or python3 to extract ${archive}"
  return 1
}

if [ -x "${ANDROID_HOME}/platform-tools/adb" ] && [ -d "${ANDROID_HOME}/platforms/android-36" ]; then
  echo "Android SDK ready at ${ANDROID_HOME}"
  return 0 2>/dev/null || exit 0
fi

echo "Setting up Android SDK at ${ANDROID_HOME}..."
mkdir -p "${ANDROID_HOME}/cmdline-tools"

if [ ! -d "${ANDROID_HOME}/cmdline-tools/latest" ]; then
  tmp_zip="/tmp/android-cmdline-tools.zip"
  tmp_extract="/tmp/android-cmdline-tools-extract"
  curl -fsSL \
    "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" \
    -o "${tmp_zip}"
  rm -rf "${tmp_extract}"
  mkdir -p "${tmp_extract}"
  unzip_archive "${tmp_zip}" "${tmp_extract}"
  rm -rf "${ANDROID_HOME}/cmdline-tools/latest"
  mv "${tmp_extract}/cmdline-tools" "${ANDROID_HOME}/cmdline-tools/latest"
fi

yes | sdkmanager --licenses >/dev/null || true
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0" "ndk;27.1.12297006"

echo "Android SDK setup complete."
echo "ANDROID_HOME=${ANDROID_HOME}"
