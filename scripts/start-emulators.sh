#!/usr/bin/env bash
# Always isolated: never infer the project from .firebaserc.
set -euo pipefail
if [ "$#" -ne 1 ]; then
  echo "Usage: bash scripts/start-emulators.sh 'npm run test:rules'" >&2
  exit 1
fi
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
export FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
export FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
mkdir -p .firebase/emulator-tmp
export TMPDIR="$(pwd)/.firebase/emulator-tmp"
exec npx --yes --package=firebase-tools@15.34.0 -- firebase emulators:exec \
  --project demo-bingeki-quality --only auth,firestore,storage "$1"
