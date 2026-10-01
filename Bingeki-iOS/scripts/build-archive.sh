#!/usr/bin/env bash
#
# build-archive.sh — Génération de l'archive Xcode Release pour TestFlight
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IOS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${IOS_DIR}"

OUTPUT_DIR="${IOS_DIR}/build"
ARCHIVE_PATH="${OUTPUT_DIR}/Bingeki.xcarchive"

echo "→ Synchronisation XcodeGen..."
xcodegen generate >/dev/null

echo "→ Nettoyage du répertoire de build..."
rm -rf "${ARCHIVE_PATH}"
mkdir -p "${OUTPUT_DIR}"

echo "→ Création de l'archive Release..."
xcodebuild archive \
  -project Bingeki.xcodeproj \
  -scheme Bingeki \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "${ARCHIVE_PATH}" \
  CODE_SIGNING_ALLOWED=NO \
  -quiet

if [[ -d "${ARCHIVE_PATH}" ]]; then
  echo "✓ Archive Release générée avec succès : ${ARCHIVE_PATH}"
  echo "  Taille : $(du -sh "${ARCHIVE_PATH}" | cut -f1)"
else
  echo "✗ Échec de la création de l'archive" >&2
  exit 1
fi
