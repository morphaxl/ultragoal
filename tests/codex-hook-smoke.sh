#!/usr/bin/env bash
# Live smoke for Codex Stop-hook behavior. This intentionally exits 0 even when
# the live Codex run is unavailable; in that case it prints the documented
# runner fallback so release checks can proceed without faking hook semantics.
set -u

CODEX_BIN="${HOME}/.bun/bin/codex"
if [ ! -x "$CODEX_BIN" ]; then
  CODEX_BIN="$(command -v codex 2>/dev/null || true)"
fi

if [ -z "$CODEX_BIN" ]; then
  echo "CODEX_STOP_HOOK_BLOCKS=0 fallback=codex-runner reason=codex-missing"
  exit 0
fi

ROOT="$(pwd)"
T="$(mktemp -d "${ROOT}/.codex-hook-smoke.XXXXXX")"
LOG="$T/codex.jsonl"
HOOK_SCRIPT="$T/stop-hook.sh"
cat > "$HOOK_SCRIPT" <<'EOF'
#!/bin/sh
count_file="$1"
n=0
[ -f "$count_file" ] && n=$(cat "$count_file" 2>/dev/null || echo 0)
n=$((n + 1))
echo "$n" > "$count_file"
if [ "$n" -eq 1 ]; then
  echo HOOK_BLOCKED_ONCE >&2
  exit 2
fi
exit 0
EOF
chmod +x "$HOOK_SCRIPT"
COUNT="$T/count.txt"
HOOKS_DIR="$ROOT/.codex"
HOOKS_FILE="$HOOKS_DIR/hooks.json"
BACKUP="$T/hooks.json.backup"
had_hooks=0
had_dir=0
[ -d "$HOOKS_DIR" ] && had_dir=1
if [ -f "$HOOKS_FILE" ]; then
  cp "$HOOKS_FILE" "$BACKUP"
  had_hooks=1
fi

cleanup() {
  if [ "$had_hooks" -eq 1 ]; then
    mkdir -p "$HOOKS_DIR"
    cp "$BACKUP" "$HOOKS_FILE" 2>/dev/null || true
  else
    rm -f "$HOOKS_FILE" 2>/dev/null || true
  fi
  if [ "$had_dir" -eq 0 ]; then
    rmdir "$HOOKS_DIR" 2>/dev/null || true
  fi
  rm -rf "$T" 2>/dev/null || true
}
trap cleanup EXIT

mkdir -p "$HOOKS_DIR"
cat > "$HOOKS_FILE" <<EOF
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "sh \"$HOOK_SCRIPT\" \"$COUNT\"",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
EOF

(cd "$ROOT" && "$CODEX_BIN" --sandbox read-only --ask-for-approval never --dangerously-bypass-hook-trust exec --json "Reply with exactly READY." >"$LOG" 2>&1)
status=$?
count=0
[ -f "$COUNT" ] && count="$(cat "$COUNT" 2>/dev/null || echo 0)"

if [ "$status" -eq 0 ] && [ "${count:-0}" -ge 2 ]; then
  echo "CODEX_STOP_HOOK_BLOCKS=1 attempts=$count"
  exit 0
fi

if [ "${count:-0}" -eq 1 ]; then
  echo "CODEX_STOP_HOOK_BLOCKS=0 fallback=codex-runner attempts=$count status=$status"
else
  echo "CODEX_STOP_HOOK_BLOCKS=0 fallback=codex-runner reason=smoke-unavailable attempts=${count:-0} status=$status"
fi
tail -20 "$LOG" 2>/dev/null | sed 's/^/codex-smoke: /'
exit 0
