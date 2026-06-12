#!/usr/bin/env bash
# Lance les Firebase Emulators et attend qu'ils soient prêts avant d'exécuter les tests.
# Usage : bash scripts/start-emulators.sh "npm run test:emulator"

set -euo pipefail

COMMAND="${1:-echo 'No command provided'}"
FIRESTORE_PORT=8080
FUNCTIONS_PORT=5001
MAX_WAIT=60

export FIRESTORE_EMULATOR_HOST="localhost:${FIRESTORE_PORT}"
export FIREBASE_STORAGE_EMULATOR_HOST="localhost:9199"
export FUNCTIONS_EMULATOR_HOST="localhost:${FUNCTIONS_PORT}"

echo "🔥 Démarrage des Firebase Emulators..."

npx firebase emulators:start --only firestore,functions &
EMULATOR_PID=$!

wait_for_port() {
  local port=$1
  local name=$2
  local elapsed=0

  echo "⏳ Attente de l'émulateur ${name} sur le port ${port}..."
  until nc -z localhost "${port}" 2>/dev/null; do
    sleep 1
    elapsed=$((elapsed + 1))
    if [ "${elapsed}" -ge "${MAX_WAIT}" ]; then
      echo "❌ Timeout : l'émulateur ${name} n'a pas démarré dans les ${MAX_WAIT}s"
      kill "${EMULATOR_PID}" 2>/dev/null || true
      exit 1
    fi
  done
  echo "✅ Émulateur ${name} prêt (${elapsed}s)"
}

wait_for_port "${FIRESTORE_PORT}" "Firestore"
wait_for_port "${FUNCTIONS_PORT}" "Functions"

echo "🧪 Lancement des tests : ${COMMAND}"
eval "${COMMAND}"
TEST_EXIT=$?

echo "🛑 Arrêt des émulateurs..."
kill "${EMULATOR_PID}" 2>/dev/null || true
wait "${EMULATOR_PID}" 2>/dev/null || true

echo "✅ Terminé (exit code: ${TEST_EXIT})"
exit "${TEST_EXIT}"
