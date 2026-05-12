#!/usr/bin/env bash
# Sentinel · Vultr deployment script
# Usage: ./scripts/deploy-vultr.sh <vultr-ip>

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <vultr-ip>"
  exit 1
fi

VULTR_IP="$1"
SSH_OPTS="-o StrictHostKeyChecking=accept-new -o ConnectTimeout=10"
REMOTE="root@${VULTR_IP}"

echo "==> Sentinel deploy targeting ${REMOTE}"
ssh ${SSH_OPTS} "${REMOTE}" "echo connected as \$(whoami)" || {
  echo "SSH failed. Verify key in Vultr dashboard."
  exit 1
}

echo "==> Installing Node + bun + caddy..."
ssh ${SSH_OPTS} "${REMOTE}" bash -s <<'REMOTE_PREP'
set -euo pipefail
apt-get update -qq
apt-get install -y curl git unzip ca-certificates debian-keyring debian-archive-keyring apt-transport-https
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs
curl -fsSL https://bun.sh/install | BUN_INSTALL=/usr/local bash
ln -sf /usr/local/bin/bun /usr/local/bin/bunx
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update -qq
apt-get install -y caddy
REMOTE_PREP

echo "==> Sync code..."
ssh ${SSH_OPTS} "${REMOTE}" "mkdir -p /opt/sentinel"
rsync -azP --exclude=node_modules --exclude=.next --exclude=.git --exclude=.env.local \
  ./ "${REMOTE}:/opt/sentinel/"
scp ${SSH_OPTS} ./.env.local "${REMOTE}:/opt/sentinel/.env.local"

echo "==> Install + build..."
ssh ${SSH_OPTS} "${REMOTE}" "cd /opt/sentinel && bun install && bun run build"

echo "==> systemd + caddy..."
ssh ${SSH_OPTS} "${REMOTE}" bash -s <<'REMOTE_SVC'
set -euo pipefail
cat > /etc/systemd/system/sentinel.service <<EOF
[Unit]
Description=Sentinel
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/sentinel
EnvironmentFile=/opt/sentinel/.env.local
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/local/bin/bun run start
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now sentinel.service
cat > /etc/caddy/Caddyfile <<EOF
:80 {
  reverse_proxy 127.0.0.1:3000
}
EOF
systemctl reload caddy
sleep 3
systemctl is-active --quiet sentinel || { journalctl -u sentinel -n 40 --no-pager; exit 1; }
REMOTE_SVC

ssh ${SSH_OPTS} "${REMOTE}" "curl -sf -o /dev/null -w 'health: HTTP %{http_code}\n' http://localhost:3000/api/incidents"

echo ""
echo "==> ✓ Deploy complete · http://${VULTR_IP}/"
