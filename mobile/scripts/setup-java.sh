#!/usr/bin/env bash
# Install or locate JDK 17 without sudo (for self-hosted CI agents).
set -euo pipefail

JDK_INSTALL_DIR="${OLEACHRON_JDK_HOME:-${HOME}/.oleachron/jdk-17}"

try_java_home() {
  local candidate="$1"
  if [ -n "${candidate}" ] && [ -x "${candidate}/bin/java" ]; then
    export JAVA_HOME="${candidate}"
    export PATH="${JAVA_HOME}/bin:${PATH}"
    return 0
  fi
  return 1
}

resolve_existing_java() {
  if try_java_home "${JAVA_HOME:-}"; then
    return 0
  fi

  local candidate
  for candidate in \
    "${JAVA_HOME_17_X64:-}" \
    "${JAVA_HOME_11_X64:-}" \
    /usr/lib/jvm/java-17-openjdk-amd64 \
    /usr/lib/jvm/java-17-openjdk \
    /usr/lib/jvm/temurin-17-jdk-amd64 \
    /usr/lib/jvm/java-17-amazon-corretto \
    "${JDK_INSTALL_DIR}"; do
    if try_java_home "${candidate}"; then
      return 0
    fi
  done

  if command -v java >/dev/null 2>&1; then
    local java_bin
    java_bin="$(command -v java)"
    local java_real
    java_real="$(readlink -f "${java_bin}")"
    export JAVA_HOME="$(cd "$(dirname "${java_real}")/.." && pwd)"
    export PATH="${JAVA_HOME}/bin:${PATH}"
    return 0
  fi

  return 1
}

install_portable_jdk17() {
  if try_java_home "${JDK_INSTALL_DIR}"; then
    return 0
  fi

  echo "Downloading portable Temurin JDK 17 to ${JDK_INSTALL_DIR} (no sudo)..."
  mkdir -p "$(dirname "${JDK_INSTALL_DIR}")"
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  curl -fsSL \
    "https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse?project=jdk" \
    -o "${tmp_dir}/jdk.tar.gz"
  tar -xzf "${tmp_dir}/jdk.tar.gz" -C "${tmp_dir}"
  rm -rf "${JDK_INSTALL_DIR}"
  local extracted
  extracted="$(find "${tmp_dir}" -maxdepth 1 -type d -name 'jdk-*' | head -1)"
  if [ -z "${extracted}" ]; then
    echo "ERROR: Failed to extract JDK archive"
    exit 1
  fi
  mv "${extracted}" "${JDK_INSTALL_DIR}"
  rm -rf "${tmp_dir}"
  try_java_home "${JDK_INSTALL_DIR}"
}

if ! resolve_existing_java; then
  install_portable_jdk17
fi

if [ ! -x "${JAVA_HOME}/bin/java" ]; then
  echo "ERROR: JAVA_HOME is not configured (${JAVA_HOME:-unset})"
  exit 1
fi

echo "JAVA_HOME=${JAVA_HOME}"
java -version
