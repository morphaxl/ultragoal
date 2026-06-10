#!/usr/bin/env bash
# ultragoal session context — runs as a SessionStart hook.
# Injects (as context Claude can see): an active/paused goal banner, the head
# of the memory index, and a compaction nudge when due. Prints nothing for
# projects that don't use ultragoal.
#
# Invariant: FAIL OPEN — always exit 0.

ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"
UG="$ROOT/.ultragoal"
[ -d "$UG" ] || exit 0

# session counter (drives the ~10-session compaction cadence)
mkdir -p "$UG/memory" 2>/dev/null
sess_file="$UG/memory/.sessions"
s=0
[ -r "$sess_file" ] && s="$(tr -dc '0-9' < "$sess_file" 2>/dev/null)"
case "$s" in '') s=0 ;; esac
s=$((s + 1))
printf '%s' "$s" > "$sess_file" 2>/dev/null || true

echo "<ultragoal-context>"

GOAL="$UG/goals/active.md"
if [ -r "$GOAL" ]; then
  status="$(sed -n 's/^status:[[:space:]]*//p' "$GOAL" 2>/dev/null | head -1 | tr -d '[:space:]')"
  slug="$(sed -n 's/^slug:[[:space:]]*//p' "$GOAL" 2>/dev/null | head -1)"
  budget="$(sed -n 's/^budget:[[:space:]]*//p' "$GOAL" 2>/dev/null | head -1 | tr -d '[:space:]')"
  turns=0
  [ -r "$UG/goals/.turns" ] && turns="$(tr -dc '0-9' < "$UG/goals/.turns" 2>/dev/null)"
  case "$status" in
    active)
      echo "ACTIVE GOAL: \"$slug\" — turn ${turns:-0} of ${budget:-25}. The goal loop is armed: resume working toward the rubric in .ultragoal/goals/active.md. /ultragoal:status for details, /ultragoal:stop to abandon."
      ;;
    paused)
      echo "PAUSED GOAL: \"$slug\" exists in .ultragoal/goals/active.md. If the user wants to resume it, set \"status: active\" and continue; otherwise leave it."
      ;;
  esac
fi

MEM="$UG/memory/MEMORY.md"
if [ -r "$MEM" ]; then
  echo "Project memory index (.ultragoal/memory/MEMORY.md) — consult relevant topic files before substantial work; trust [VERIFIED] facts, re-check [UNVERIFIED] ones:"
  head -c 8192 "$MEM" 2>/dev/null | head -100
fi

if [ "$s" -ge 10 ]; then
  echo "Memory upkeep: $s sessions since the last compaction — when convenient, suggest /ultragoal:compact to the user."
fi

echo "</ultragoal-context>"
exit 0
