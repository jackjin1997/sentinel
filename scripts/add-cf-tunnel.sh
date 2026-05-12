#!/usr/bin/env bash
# Adds Cloudflare Tunnel to an already-deployed Sentinel Vultr instance.
# Gives a free public https://*.trycloudflare.com URL that bypasses
# GFW throttling on direct Vultr SG/JP IPs.
#
# Usage: ./scripts/add-cf-tunnel.sh <vultr-ip>

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <vultr-ip>"
  exit 1
fi

VULTR_IP="$1"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/sentinel_vultr_ed25519}"
SSH_OPTS="-i ${SSH_KEY} -o StrictHostKeyChecking=accept-new -o ConnectTimeout=30 -o IdentitiesOnly=yes -o ServerAliveInterval=15 -o ServerAliveCountMax=4"
REMOTE="root@${VULTR_IP}"

echo "==> Installing cloudflared on ${REMOTE}..."
ssh ${SSH_OPTS} "${REMOTE}" bash -s <<'REMOTE_INSTALL'
set -euo pipefail
if ! command -v cloudflared >/dev/null 2>&1; then
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
  echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' | tee /etc/apt/sources.list.d/cloudflared.list
  apt-get update -qq
  apt-get install -y cloudflared
fi

cat > /etc/systemd/system/cf-tunnel.service <<'EOF'
[Unit]
Description=Cloudflare Tunnel (ephemeral) for Sentinel
After=network.target sentinel.service
Requires=sentinel.service

[Service]
Type=simple
ExecStart=/usr/local/bin/cloudflared tunnel --no-autoupdate --url http://localhost:3000
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now cf-tunnel.service
sleep 8
journalctl -u cf-tunnel -n 80 --no-pager | grep -E "trycloudflare\.com|registered|established|error" | head -20
REMOTE_INSTALL

echo ""
echo "==> Extracting public Tunnel URL..."
sleep 3
URL=$(ssh ${SSH_OPTS} "${REMOTE}" "journalctl -u cf-tunnel -n 200 --no-pager | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | head -1")
if [ -n "$URL" ]; then
  echo ""
  echo "  ✓ Cloudflare Tunnel live: $URL"
  echo ""
  echo "  Original direct IP: http://${VULTR_IP}/  (may be GFW-throttled from China)"
  echo "  CF Tunnel URL:      $URL  (works globally, including China)"
else
  echo "  ⚠ Could not extract URL from logs. Check with:"
  echo "    ssh ${REMOTE} 'journalctl -u cf-tunnel -n 100'"
fi
