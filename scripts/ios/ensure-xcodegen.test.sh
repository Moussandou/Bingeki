#!/usr/bin/env bash
# Harness for ensure-xcodegen.sh using a fake brew: cold, warm-linked, warm-unlinked.
set -euo pipefail
SCRIPT="$(cd "$(dirname "$0")" && pwd)/ensure-xcodegen.sh"

run_case() {
  local name="$1" state="$2" tmp bin
  tmp="$(mktemp -d)"; bin="$tmp/bin"; mkdir -p "$bin" "$tmp/cellar"
  cat > "$bin/brew" <<BREW
#!/usr/bin/env bash
mk() { printf '#!/bin/sh\necho 2.46.0\n' > "$bin/xcodegen"; chmod +x "$bin/xcodegen"; }
case "\$1" in
  list) [ -e "$tmp/cellar/xcodegen" ] && echo "xcodegen 2.46.0" ;;
  link) [ -e "$tmp/cellar/xcodegen" ] && mk ;;
  install) if [ -e "$tmp/cellar/xcodegen" ]; then echo "already installed, not linked" >&2; else touch "$tmp/cellar/xcodegen"; mk; fi ;;
  reinstall) touch "$tmp/cellar/xcodegen"; mk ;;
esac
BREW
  chmod +x "$bin/brew"
  case "$state" in
    linked) touch "$tmp/cellar/xcodegen"; printf '#!/bin/sh\necho 2.46.0\n' > "$bin/xcodegen"; chmod +x "$bin/xcodegen" ;;
    unlinked) touch "$tmp/cellar/xcodegen" ;;
  esac
  out="$(PATH="$bin:/usr/bin:/bin" bash "$SCRIPT")" || { echo "FAIL $name"; exit 1; }
  [[ "$out" == *"2.46.0"* ]] || { echo "FAIL $name: $out"; exit 1; }
  echo "ok $name"
  rm -rf "$tmp"
}

run_case cold none
run_case warm-linked linked
run_case warm-unlinked unlinked
