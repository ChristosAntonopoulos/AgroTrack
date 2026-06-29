#!/usr/bin/env bash
# Idempotent Android SDK setup for local APK builds on Linux CI agents.
set -euo pipefail

export ANDROID_HOME="${ANDROID_HOME:-${HOME}/Android/Sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$PATH:${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/cmdline-tools/latest/bin"

if ! command -v java >/dev/null 2>&1; then
  echo "Installing OpenJDK 17..."
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -qq
    sudo apt-get install -y openjdk-17-jdk unzip curl
  else
    echo "ERROR: Java is required but apt-get is not available."
    exit 1
  fi
fi

if [ -x "${ANDROID_HOME}/platform-tools/adb" ] && [ -d "${ANDROID_HOME}/platforms/android-36" ]; then
  echo "Android SDK ready at ${ANDROID_HOME}"
  java -version
  exit 0
fi

echo "Setting up Android SDK at ${ANDROID_HOME}..."
mkdir -p "${ANDROID_HOME}/cmdline-tools"

if [ ! -d "${ANDROID_HOME}/cmdline-tools/latest" ]; then
  TMP_ZIP="/tmp/android-cmdline-tools.zip"
  curl -fsSL "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" -o "${TMP_ZIP}"
  rm -rf /tmp/android-cmdline-tools-extract
  unzip -q -o "${TMP_ZIP}" -d /tmp/android-cmdline-tools-extract
  rm -rf "${ANDROID_HOME}/cmdline-tools/latest"
  mv /tmp/android-cmdline-tools-extract/cmdline-tools "${ANDROID_HOME}/cmdline-tools/latest"
fi

yes | sdkmanager --licenses >/dev/null || true
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0" "ndk;27.1.12297006"

echo "Android SDK setup complete."
java -version
