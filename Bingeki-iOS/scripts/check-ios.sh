#!/usr/bin/env bash
#
# check-ios.sh — Contrôle qualité, tests et validation de déploiement iOS
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IOS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${IOS_DIR}"

COLOR_RESET="\033[0m"
COLOR_GREEN="\033[32m"
COLOR_RED="\033[31m"
COLOR_YELLOW="\033[33m"
COLOR_BLUE="\033[34m"

info() { echo -e "${COLOR_BLUE}→ $1${COLOR_RESET}"; }
success() { echo -e "${COLOR_GREEN}✓ $1${COLOR_RESET}"; }
warn() { echo -e "${COLOR_YELLOW}⚠️  $1${COLOR_RESET}"; }
error() { echo -e "${COLOR_RED}✗ $1${COLOR_RESET}"; exit 1; }

echo "=================================================="
echo "    BINGEKI iOS — Contrôle Qualité & Tests       "
echo "=================================================="

# 1. Vérification des outils requis
info "Vérification de l'environnement..."
command -v xcodegen >/dev/null 2>&1 || error "xcodegen n'est pas installé (brew install xcodegen)"
command -v xcodebuild >/dev/null 2>&1 || error "xcodebuild est introuvable"

# 2. Détection d'un simulateur disponible
DEVICE_NAME="${IOS_SIM_DEVICE:-iPhone 17 Pro}"
if ! xcrun simctl list devices available | grep -q "${DEVICE_NAME}"; then
  DEVICE_NAME="$(xcrun simctl list devices available | grep -m1 "iPhone" | sed -E 's/^[[:space:]]+//; s/ \([0-9A-F-]+\).*//' || true)"
fi
[[ -z "${DEVICE_NAME}" ]] && error "Aucun simulateur iPhone disponible"
info "Simulateur cible : ${DEVICE_NAME}"

# 3. Scan de sécurité / secrets
info "Audit de sécurité (détection de secrets / clés privées)..."
if grep -rEn "discord(app)?\.com/api/webhooks/[0-9]+/|-----BEGIN [A-Z ]*PRIVATE KEY-----" \
  "${IOS_DIR}" --include="*.swift" --include="*.yml" 2>/dev/null; then
  error "Secret détecté dans les sources iOS !"
fi
success "Aucun secret hardcodé détecté"

# 4. Génération XcodeGen
info "Génération du projet Xcode (xcodegen)..."
xcodegen generate >/dev/null
success "Projet Xcode synchronisé (Bingeki.xcodeproj)"

# 5. Tests unitaires (Swift Testing)
info "Exécution des tests unitaires (BingekiTests)..."
xcodebuild test \
  -project Bingeki.xcodeproj \
  -scheme Bingeki \
  -destination "platform=iOS Simulator,name=${DEVICE_NAME}" \
  -only-testing:BingekiTests \
  -quiet \
  || error "Échec des tests unitaires"
success "Tests unitaires validés"

# 6. Tests d'interface automatisés (UI Tests XCTest)
info "Exécution des tests d'interface (BingekiUITests)..."
xcodebuild test \
  -project Bingeki.xcodeproj \
  -scheme Bingeki \
  -destination "platform=iOS Simulator,name=${DEVICE_NAME}" \
  -only-testing:BingekiUITests \
  -quiet \
  || error "Échec des tests UI"
success "Tests d'interface validés"

# 7. Validation de la compilation Release (qualité de déploiement)
info "Validation de la compilation Release (sans signature)..."
xcodebuild build \
  -project Bingeki.xcodeproj \
  -scheme Bingeki \
  -configuration Release \
  -destination "generic/platform=iOS" \
  CODE_SIGNING_ALLOWED=NO \
  -quiet \
  || error "Échec de la compilation Release"
success "Compilation Release validée (prête pour TestFlight / Archive)"

echo "=================================================="
echo -e "${COLOR_GREEN}✓ TOUS LES TESTS ET CONTRÔLES QUALITÉ SONT VERTS !${COLOR_RESET}"
echo "=================================================="
