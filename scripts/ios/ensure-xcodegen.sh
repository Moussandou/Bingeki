#!/usr/bin/env bash
# Idempotent XcodeGen setup: works on cold, warm-linked and warm-unlinked (cached Cellar) runners.
set -euo pipefail

if command -v xcodegen >/dev/null 2>&1 && xcodegen --version >/dev/null 2>&1; then
  xcodegen --version
  exit 0
fi

if brew list --versions xcodegen >/dev/null 2>&1; then
  # Cellar restored from cache but not linked into PATH.
  brew link --overwrite xcodegen || brew reinstall xcodegen
else
  brew install xcodegen
fi

hash -r
xcodegen --version
