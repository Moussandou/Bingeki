#!/usr/bin/env bash
#
# build-archive.sh — Génération de l'archive Xcode Release pour TestFlight
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IOS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${IOS_DIR}"

if [[ -z "${DEVELOPMENT_TEAM:-}" ]]; then
  echo "✗ DEVELOPMENT_TEAM is required for a signed TestFlight archive." >&2
  echo "  Set it to the Apple Developer Team ID, then rerun this script." >&2
  exit 1
fi
if [[ ! "${DEVELOPMENT_TEAM}" =~ ^[A-Z0-9]{10}$ ]]; then
  echo "✗ DEVELOPMENT_TEAM must be a 10-character Apple Developer Team ID." >&2
  exit 1
fi

OUTPUT_DIR="${IOS_DIR}/build"
ARCHIVE_PATH="${OUTPUT_DIR}/Bingeki.xcarchive"
EXPORT_PATH="${OUTPUT_DIR}/AppStore"
EXPORT_OPTIONS="${OUTPUT_DIR}/ExportOptions.plist"

echo "→ Synchronisation XcodeGen..."
xcodegen generate >/dev/null

echo "→ Nettoyage du répertoire de build..."
rm -rf "${ARCHIVE_PATH}" "${EXPORT_PATH}"
mkdir -p "${OUTPUT_DIR}"

cat > "${EXPORT_OPTIONS}" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>destination</key><string>export</string>
  <key>method</key><string>app-store-connect</string>
  <key>signingStyle</key><string>automatic</string>
  <key>teamID</key><string>${DEVELOPMENT_TEAM}</string>
  <key>uploadSymbols</key><true/>
</dict>
</plist>
PLIST

echo "→ Création de l'archive Release..."
xcodebuild archive \
  -project Bingeki.xcodeproj \
  -scheme Bingeki \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "${ARCHIVE_PATH}" \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="${DEVELOPMENT_TEAM}" \
  CODE_SIGN_STYLE=Automatic \
  CODE_SIGNING_ALLOWED=YES \
  -quiet

echo "→ Export de l'IPA pour App Store Connect / TestFlight..."
xcodebuild -exportArchive \
  -archivePath "${ARCHIVE_PATH}" \
  -exportPath "${EXPORT_PATH}" \
  -exportOptionsPlist "${EXPORT_OPTIONS}" \
  -allowProvisioningUpdates \
  -quiet

IPA_PATH="${EXPORT_PATH}/Bingeki.ipa"
if [[ ! -f "${IPA_PATH}" ]]; then
  echo "✗ L'export n'a pas produit l'IPA attendue : ${IPA_PATH}" >&2
  exit 1
fi

echo "✓ Archive signée : ${ARCHIVE_PATH}"
echo "✓ IPA exportée : ${IPA_PATH} ($(du -sh "${IPA_PATH}" | cut -f1))"
