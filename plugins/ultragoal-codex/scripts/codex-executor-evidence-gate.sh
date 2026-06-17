#!/usr/bin/env sh
# SubagentStop evidence gate for ultragoal-executor.
#
# Blocks executor completion when the final message does not point at a
# non-empty receipt under .ultragoal/evidence/. Fail-open on malformed hook
# state or after a small retry cap so the hook cannot trap a session forever.

payload=""
if [ ! -t 0 ]; then payload=$(cat 2>/dev/null); fi

json_field() {
  printf '%s' "$payload" | sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\([^\"\\\\]*\)\".*/\1/p" | head -1
}

agent_type=$(json_field agent_type)
[ "$agent_type" = "ultragoal-executor" ] || exit 0

cwd=$(json_field cwd)
[ -n "$cwd" ] || cwd="${PWD:-.}"
[ -d "$cwd" ] || exit 0

session_id=$(json_field session_id)
agent_id=$(json_field agent_id)
[ -n "$session_id" ] || session_id=unknown-session
[ -n "$agent_id" ] || agent_id=unknown-agent

receipt=$(printf '%s' "$payload" | sed -n 's/.*ULTRAGOAL_EVIDENCE_RECORDED:[[:space:]]*\([^"\\[:space:]]*\).*/\1/p' | tail -1)
evidence_root="$cwd/.ultragoal/evidence"

physical_path() {
  target="$1"
  dir=$(dirname -- "$target")
  base=$(basename -- "$target")
  [ -d "$dir" ] || return 1
  phys_dir=$(CDPATH= cd -- "$dir" 2>/dev/null && pwd -P) || return 1
  printf '%s/%s\n' "$phys_dir" "$base"
}

valid_receipt=0
if [ -n "$receipt" ]; then
  case "$receipt" in
    /*) receipt_path="$receipt" ;;
    *) receipt_path="$cwd/$receipt" ;;
  esac
  if [ -d "$evidence_root" ] && [ -f "$receipt_path" ] && [ -s "$receipt_path" ] && [ ! -L "$receipt_path" ]; then
    real_cwd=$(CDPATH= cd -- "$cwd" 2>/dev/null && pwd -P)
    real_root=$(CDPATH= cd -- "$evidence_root" 2>/dev/null && pwd -P)
    real_file=$(physical_path "$receipt_path")
    case "$real_root" in "$real_cwd/.ultragoal/evidence") root_ok=1 ;; *) root_ok=0 ;; esac
    case "$real_file" in "$real_root"/*) file_ok=1 ;; *) file_ok=0 ;; esac
    if [ "$root_ok" -eq 1 ] && [ "$file_ok" -eq 1 ]; then
      valid_receipt=1
    fi
  fi
fi

state_dir="$cwd/.ultragoal/.executor-gate"
safe_session=$(printf '%s' "$session_id" | tr -cd 'A-Za-z0-9_.-')
safe_agent=$(printf '%s' "$agent_id" | tr -cd 'A-Za-z0-9_.-')
[ -n "$safe_session" ] || safe_session=unknown-session
[ -n "$safe_agent" ] || safe_agent=unknown-agent
attempt_file="$state_dir/$safe_session.$safe_agent.attempts"

if [ "$valid_receipt" -eq 1 ]; then
  rm -f "$attempt_file" 2>/dev/null || true
  exit 0
fi

mkdir -p "$state_dir" 2>/dev/null || exit 0
attempts=0
[ -r "$attempt_file" ] && attempts=$(tr -dc '0-9' < "$attempt_file" 2>/dev/null)
case "$attempts" in ''|*[!0-9]*) attempts=0 ;; esac

if [ "$attempts" -ge 3 ]; then
  rm -f "$attempt_file" 2>/dev/null || true
  exit 0
fi

attempts=$((attempts + 1))
printf '%s' "$attempts" > "$attempt_file" 2>/dev/null || true

reason="Ultragoal executor stopped without a valid evidence receipt (attempt $attempts/3). Run the assigned checks, write a non-empty receipt under .ultragoal/evidence/, and end the final response with exactly: ULTRAGOAL_EVIDENCE_RECORDED: <path>"
printf '{"decision":"block","reason":"%s"}\n' "$reason"
