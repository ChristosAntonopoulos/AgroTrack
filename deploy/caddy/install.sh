#!/usr/bin/env bash
# Install this product's Caddy site into /etc/caddy/sites/ and reload Caddy.
set -euo pipefail

SITE_NAME="agrotrack"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITES_DIR="/etc/caddy/sites"
MAIN_FILE="/etc/caddy/Caddyfile"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash deploy/caddy/install.sh"
  exit 1
fi

if ! command -v caddy >/dev/null 2>&1; then
  echo "Install Caddy first (see LearningTree backend/k8s/setup-caddy.sh)"
  exit 1
fi

mkdir -p "$SITES_DIR"
install -m 644 "$SCRIPT_DIR/Caddyfile" "$SITES_DIR/${SITE_NAME}.caddy"

if [ ! -f "$MAIN_FILE" ] || ! grep -q 'import /etc/caddy/sites/\*\.caddy' "$MAIN_FILE"; then
  cat > "$MAIN_FILE" <<'EOF'
# Startup portfolio — one file per product under /etc/caddy/sites/
import /etc/caddy/sites/*.caddy
EOF
fi

caddy validate --config "$MAIN_FILE"
systemctl reload caddy || systemctl restart caddy

echo "Installed ${SITE_NAME}.caddy"
echo "  https://agrotrack.conceptatlas.eu"
echo "  https://api.agrotrack.conceptatlas.eu"
