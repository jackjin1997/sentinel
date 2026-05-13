#!/usr/bin/env bash
# Quick redeploy — assumes Node/bun/caddy/cf-tunnel already installed.
# Just: rsync code → bun install → bun run build → systemctl restart sentinel.
# Uses SSH ControlMaster to multiplex through one connection (resilient to
# SG-China link flapping).
#
# Usage: ./scripts/quick-redeploy.sh <vultr-ip>

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <vultr-ip>"
  exit 1
fi

VULTR_IP="$1"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/sentinel_vultr_ed25519}"
CTRL="/tmp/ssh-vultr-mux-quick"
SSH_BASE="-i ${SSH_KEY} -o StrictHostKeyChecking=accept-new -o ConnectTimeout=30 -o IdentitiesOnly=yes -o ServerAliveInterval=15 -o ServerAliveCountMax=4"
REMOTE="root@${VULTR_IP}"

cleanup() {
  ssh -S "$CTRL" -O exit "$REMOTE" 2>/dev/null || true
  rm -f "$CTRL"
}
trap cleanup EXIT

# Establish ControlMaster with up to 10 retries (SG-China link flaps)
for i in 1 2 3 4 5 6 7 8 9 10; do
  echo "==> attempt $i to open control connection..."
  if ssh -fN -M -S "$CTRL" -o ControlPersist=600 ${SSH_BASE} "$REMOTE" 2>&1; then
    echo "  ✓ control master up"
    break
  fi
  if [ $i -lt 10 ]; then sleep 8; fi
done

if [ ! -S "$CTRL" ]; then
  echo "✗ failed to establish SSH connection after 10 attempts"
  exit 1
fi

# Health probe via master (proves it's working)
ssh -S "$CTRL" "$REMOTE" "uptime" || { echo "✗ control master broken"; exit 1; }

echo ""
echo "==> rsync code..."
rsync -e "ssh -S $CTRL -i $SSH_KEY" -azP \
  --exclude=node_modules --exclude=.next --exclude=.git --exclude=.env.local \
  --exclude=samples --exclude=public/og/0[1-4]-*.png \
  ./ "${REMOTE}:/opt/sentinel/"

echo ""
echo "==> bun install + build..."
ssh -S "$CTRL" "$REMOTE" "cd /opt/sentinel && bun install 2>&1 | tail -3 && bun run build 2>&1 | tail -5"

echo ""
echo "==> restart sentinel (cf-tunnel decoupled, won't rotate URL)..."
ssh -S "$CTRL" "$REMOTE" "systemctl restart sentinel && sleep 3 && systemctl is-active sentinel cf-tunnel"

echo ""
echo "==> health check..."
sleep 3
ssh -S "$CTRL" "$REMOTE" "curl -s -o /dev/null -w 'app local: HTTP %{http_code}\n' http://127.0.0.1:3000/"

echo ""
echo "==> ✓ quick redeploy complete"
