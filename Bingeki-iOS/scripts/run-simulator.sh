#!/bin/bash
# Build, install, launch and screenshot Bingeki on an iOS Simulator.
#
# Usage:
#   ./scripts/run-simulator.sh                # build + run + screenshot
#   ./scripts/run-simulator.sh --no-screenshot # build + run only
#   ./scripts/run-simulator.sh --device "iPhone 17"
#
# Screenshots land in scripts/screenshots/<timestamp>.png and the script
# opens the simulator's window so you can keep interacting with the app
# yourself after it launches — this is meant for actually looking at the
# app, not just confirming it compiles (use `xcodebuild build` for that).
set -euo pipefail
cd "$(dirname "$0")/.."

DEVICE_NAME="iPhone 17 Pro"
TAKE_SCREENSHOT=1
while [[ $# -gt 0 ]]; do
  case "$1" in
    --device) DEVICE_NAME="$2"; shift 2 ;;
    --no-screenshot) TAKE_SCREENSHOT=0; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

BUNDLE_ID="com.bingeki.ios"
SCHEME="Bingeki"

echo "→ Generating project (xcodegen)…"
xcodegen generate

echo "→ Building for the simulator…"
xcodebuild -project Bingeki.xcodeproj -scheme "$SCHEME" \
  -destination "platform=iOS Simulator,name=$DEVICE_NAME" \
  -configuration Debug build \
  | grep -E "error:|BUILD (SUCCEEDED|FAILED)" || true

APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData -path "*Debug-iphonesimulator/Bingeki.app" -maxdepth 6 2>/dev/null | head -1)
if [[ -z "$APP_PATH" ]]; then
  echo "Could not find the built .app — check the build log above." >&2
  exit 1
fi

DEVICE_ID=$(xcrun simctl list devices available | grep "$DEVICE_NAME (" | head -1 | grep -oE '[0-9A-F-]{36}')
if [[ -z "$DEVICE_ID" ]]; then
  echo "No available simulator named '$DEVICE_NAME'. Try: xcrun simctl list devices available" >&2
  exit 1
fi

echo "→ Booting $DEVICE_NAME ($DEVICE_ID)…"
xcrun simctl bootstatus "$DEVICE_ID" -b >/dev/null 2>&1 || true
open -a Simulator --args -CurrentDeviceUDID "$DEVICE_ID"

echo "→ Installing and launching…"
xcrun simctl terminate "$DEVICE_ID" "$BUNDLE_ID" 2>/dev/null || true
xcrun simctl install "$DEVICE_ID" "$APP_PATH"
xcrun simctl launch "$DEVICE_ID" "$BUNDLE_ID"

if [[ "$TAKE_SCREENSHOT" == "1" ]]; then
  sleep 2
  mkdir -p scripts/screenshots
  OUT="scripts/screenshots/$(date +%Y%m%d-%H%M%S).png"
  xcrun simctl io "$DEVICE_ID" screenshot "$OUT"
  echo "→ Screenshot: $OUT"
  open "$OUT"
fi

echo "✓ Done. The Simulator window is open — try the app directly."
