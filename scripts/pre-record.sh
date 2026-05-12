#!/usr/bin/env bash
# Pre-record warm-up for Sentinel demo.
# Run this at 20:25 (5min before recording) to:
#   1. Wake up CF tunnel + Caddy + Next.js (eliminate cold-start lag)
#   2. Warm up Anthropic + Gemini API connections (first call has handshake overhead)
#   3. Cache static assets at CF edge
#   4. Confirm everything is green
#
# Usage: bash scripts/pre-record.sh

set -e

URL="https://wma-contacting-lindsay-orientation.trycloudflare.com"

cyan() { printf '\033[36m%s\033[0m\n' "$1"; }
green() { printf '\033[32m%s\033[0m\n' "$1"; }
warn() { printf '\033[33m%s\033[0m\n' "$1"; }
fail() { printf '\033[31m%s\033[0m\n' "$1"; }

cyan "==> [1/4] Pinging landing page x3 (CF edge cache warm-up)..."
for i in 1 2 3; do
  t=$(curl -s -o /dev/null --max-time 15 -w "%{time_total}" "$URL/")
  printf "    ping %d: %ss\n" "$i" "$t"
done

cyan "==> [2/4] Checking /api/incidents (Next.js dynamic route warm-up)..."
N=$(curl -s --max-time 10 "$URL/api/incidents" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["incidents"]))' 2>/dev/null || echo 0)
if [ "$N" = "5" ]; then green "    ✓ 5 incidents available"; else fail "    ⚠ got $N (expected 5)"; fi

cyan "==> [3/4] Running INC-001 agent end-to-end (LLM API warm-up + ~60s)..."
START=$(date +%s)
RESP=$(curl -s -N --max-time 120 -X POST "$URL/api/agent" -H "Content-Type: application/json" -d '{"incidentId":"INC-001"}')
END=$(date +%s)
ELAPSED=$((END - START))
PHASES=$(echo "$RESP" | grep -c '"type":"phase-complete"' || echo 0)
ERRORS=$(echo "$RESP" | grep -c '"type":"error"' || echo 0)
FINAL=$(echo "$RESP" | grep '"type":"final"' | head -1)
if [ "$PHASES" = "3" ] && [ "$ERRORS" = "0" ] && [ -n "$FINAL" ]; then
  green "    ✓ all 4 phases complete in ${ELAPSED}s · 0 errors · final report present"
else
  warn "    ⚠ phases=$PHASES errors=$ERRORS elapsed=${ELAPSED}s — check before recording"
fi

cyan "==> [4/4] Pre-flight checklist:"
echo "    ☐ Open $URL in your browser"
echo "    ☐ Window size: aim for 1440×900 (default Chrome window is close)"
echo "    ☐ Close personal tabs / hide bookmarks bar"
echo "    ☐ Silence notifications (macOS System Settings → Focus → Do Not Disturb)"
echo "    ☐ QuickTime → File → New Screen Recording → Options → choose 'Window'"
echo "    ☐ Click 'INC-002' to record (critical severity, sharpest diagnosis)"
echo ""
green "==> All warm. You're ready to record at 8:30pm."
echo ""
echo "    Live URL (copy this for the submission too):"
echo "    $URL"
