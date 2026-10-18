#!/bin/sh
# Regenerates Resources/Assets.xcassets/SplashLogo.imageset from the vector mark.
set -e
cd "$(dirname "$0")/../.."
out=Resources/Assets.xcassets/SplashLogo.imageset
mkdir -p "$out"
swiftc -parse-as-library -o /tmp/bk-render-launch Core/Components/BKLogoShapes.swift design/logo/main.swift 2>/dev/null || \
  swiftc -o /tmp/bk-render-launch Core/Components/BKLogoShapes.swift design/logo/main.swift
/tmp/bk-render-launch "$out"
