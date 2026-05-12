#!/usr/bin/env bash
# Post-record processing for Sentinel demo video.
# Compresses .mov from QuickTime to .mp4, uploads to GitHub Releases for a stable link.
#
# Usage:
#   bash scripts/process-demo.sh ~/Desktop/sentinel-demo.mov
#
# Output:
#   - <input>.mp4 — H.264 compressed under 30 MB (Lablab limit is ~100MB but smaller uploads faster)
#   - Uploaded to https://github.com/jackjin1997/sentinel/releases/tag/demo
#   - Direct download URL printed at end

set -euo pipefail

INPUT="${1:-$HOME/Desktop/sentinel-demo.mov}"

if [ ! -f "$INPUT" ]; then
  echo "✗ Video not found: $INPUT"
  echo "Usage: $0 ~/Desktop/sentinel-demo.mov"
  exit 1
fi

# Detect input format
DIR=$(dirname "$INPUT")
BASE=$(basename "$INPUT")
NAME="${BASE%.*}"
OUTPUT="${DIR}/${NAME}.mp4"

echo "==> [1/3] Compressing ${BASE} → ${NAME}.mp4 (H.264, ~1.5Mbps, 30fps)..."
# -crf 28 is decent web quality, -preset slow optimizes file size
# -vf scale ensures it fits 1080p at most
# -movflags +faststart enables progressive playback
ffmpeg -y -i "$INPUT" \
  -c:v libx264 -crf 26 -preset slow \
  -vf "scale='min(1920,iw)':-2" \
  -c:a aac -b:a 96k \
  -movflags +faststart \
  "$OUTPUT" 2>&1 | tail -8

if [ ! -f "$OUTPUT" ]; then
  echo "✗ ffmpeg failed to produce $OUTPUT"
  exit 1
fi

SIZE=$(du -h "$OUTPUT" | awk '{print $1}')
DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUTPUT" 2>/dev/null | head -1)
echo "    ✓ ${OUTPUT} · ${SIZE} · ${DURATION}s"

echo ""
echo "==> [2/3] Uploading to GitHub Release (tag: demo)..."
cd /Users/jinzexu/workspace_codes/personal/sentinel

# Create or update release
if gh release view demo --repo jackjin1997/sentinel >/dev/null 2>&1; then
  gh release upload demo "$OUTPUT" --clobber --repo jackjin1997/sentinel
else
  gh release create demo \
    --repo jackjin1997/sentinel \
    --title "Sentinel demo video" \
    --notes "60-second demo of multi-vendor LLM incident response in action. Built for AI Agent Olympics 2026." \
    "$OUTPUT"
fi

echo ""
echo "==> [3/3] Done. Stable download URL:"
RELEASE_URL="https://github.com/jackjin1997/sentinel/releases/download/demo/${NAME}.mp4"
echo ""
echo "    $RELEASE_URL"
echo ""
echo "    Copy this URL to Lablab.ai submission's video field if upload fails."
echo "    The local .mp4 is at: $OUTPUT"
