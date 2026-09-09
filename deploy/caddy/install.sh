#!/usr/bin/env bash
# Install this product's Caddy site into /etc/caddy/sites/ and reload Caddy.
set -euo pipefail

SITE_NAME="oleachron"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITES_DIR="/etc/caddy/sites"
MAIN_FILE="/etc/caddy/Caddyfile"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash deploy/caddy/install.sh"
  exit 1
fi

if ! command -v caddy >/dev/null 2>&1; then
  echo "ERROR: Caddy is not installed. Run ConceptAtlas pipeline first (setup-caddy.sh) or install Caddy on the host."
  exit 1
fi

mkdir -p "$SITES_DIR"

# One-time migration from legacy monolithic /etc/caddy/Caddyfile (keeps conceptatlas.eu working).
if [ -f "$MAIN_FILE" ] && ! grep -q 'import /etc/caddy/sites/\*\.caddy' "$MAIN_FILE"; then
  if [ ! -f "$SITES_DIR/conceptatlas.caddy" ]; then
    install -m 644 "$MAIN_FILE" "$SITES_DIR/conceptatlas.caddy"
    echo "Migrated legacy Caddyfile -> sites/conceptatlas.caddy"
  fi
  cat > "$MAIN_FILE" <<'EOF'
# Startup portfolio — one file per product under /etc/caddy/sites/
import /etc/caddy/sites/*.caddy
EOF
fi

install -m 644 "$SCRIPT_DIR/Caddyfile" "$SITES_DIR/${SITE_NAME}.caddy"

caddy validate --config "$MAIN_FILE"
systemctl reload caddy || systemctl restart caddy

echo "Installed ${SITE_NAME}.caddy"
echo "  https://oleachron.conceptatlas.eu"
echo "  https://api.oleachron.conceptatlas.eu"
