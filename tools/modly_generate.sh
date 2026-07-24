#!/usr/bin/env bash
# Generate a 3D mesh from an image using a running Modly desktop app.
# https://github.com/lightningpixel/modly
#
# Prerequisites:
#   1. Clone Modly and install (see README)
#   2. Install an image-to-3D extension (e.g. Hunyuan3D Mini) from Models → Install from GitHub
#   3. Launch the Modly desktop app (API on http://127.0.0.1:8765 by default)
#   4. Run this script
#
# Note: Modly's default API port is 8765. If Tide of Legends is serving on 8765,
#       stop that server or pass --base-url http://127.0.0.1:<modly-port>

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="${1:-$ROOT/assets/pirate_character_sheet.png}"
OUTPUT="${2:-$ROOT/models3d/pirate_captain_modly.glb}"
MODLY_DIR="${MODLY_DIR:-$HOME/modly}"
BASE_URL="${MODLY_BASE_URL:-http://127.0.0.1:8765}"

if [[ ! -f "$IMAGE" ]]; then
  echo "Image not found: $IMAGE" >&2
  exit 1
fi

if [[ ! -f "$MODLY_DIR/tools/modly-cli/agent.py" ]]; then
  echo "Modly not found at $MODLY_DIR"
  echo "Clone it first:"
  echo "  git clone https://github.com/lightningpixel/modly.git \"$MODLY_DIR\""
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT")"

echo "Checking Modly health at $BASE_URL ..."
python3 "$MODLY_DIR/tools/modly-cli/agent.py" --base-url "$BASE_URL" health

echo "Generating mesh from $IMAGE ..."
python3 "$MODLY_DIR/tools/modly-cli/agent.py" --base-url "$BASE_URL" generate \
  --image "$IMAGE" \
  --output "$OUTPUT" \
  --progress

echo "Done → $OUTPUT"
