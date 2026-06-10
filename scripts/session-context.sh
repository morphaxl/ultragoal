#!/usr/bin/env bash
# ultragoal session context — runs as a SessionStart hook.
# Injects (as context Claude can see): an active/paused goal banner, the head
# of the memory index, a staleness warning, and a compaction nudge when due.
# Prints nothing for projects that don't use ultragoal.
#
# Invariant: FAIL OPEN — always exit 0.

# ---- locate the .ultragoal root (walk up for monorepos/workspaces) ---------
start="${CLAUDE_PROJECT_DIR:-$PWD}"
ROOT="$start"
d="$start"
while [ -n "$d" ] && [ "$d" != "/" ] && [ "$d" != "$HOME" ]; do
  if [ -d "$d/.ultragoal" ]; then ROOT="$d"; break; fi
  d="$(dirname "$d")"
done
UG="$ROOT/.ultragoal"
[ -d "$UG" ] || exit 0

# this session's id, from the hook payload
payload=""
if [ ! -t 0 ]; then payload="$(cat 2>/dev/null)"; fi
sid="$(printf '%s' "$payload" | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"

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
  goal_sid="$(sed -n 's/^session:[[:space:]]*//p' "$GOAL" 2>/dev/null | head -1 | tr -d '[:space:]')"
  turns=0
  [ -r "$UG/goals/.turns" ] && turns="$(tr -dc '0-9' < "$UG/goals/.turns" 2>/dev/null)"
  case "$status" in
    active)
      if [ -n "$goal_sid" ] && [ -n "$sid" ] && [ "$goal_sid" != "$sid" ]; then
        echo "ACTIVE GOAL (armed by another session): \"$slug\" — turn ${turns:-0} of ${budget:-25}, in $UG/goals/active.md. The gate is NOT enforcing it in this session, so side questions are safe. If the user wants THIS session to take the goal over, set \"session: ${sid}\" in the goal file and resume; /ultragoal:status for details."
      else
        echo "ACTIVE GOAL: \"$slug\" — turn ${turns:-0} of ${budget:-25}. The goal loop is armed: resume working toward the rubric in $UG/goals/active.md. /ultragoal:status for details, /ultragoal:stop to abandon."
        if [ -z "$goal_sid" ] && [ -n "$sid" ]; then
          echo "(This goal predates session binding — set \"session: ${sid}\" in its frontmatter so the gate binds to this session only.)"
        fi
      fi
      ;;
    paused)
      echo "PAUSED GOAL: \"$slug\" exists in $UG/goals/active.md. If the user wants to resume it, set \"status: active\" (and \"session: ${sid:-the current session id}\") and continue; otherwise leave it."
      ;;
  esac
fi

MEM="$UG/memory/MEMORY.md"
if [ -r "$MEM" ]; then
  echo "Project memory index ($UG/memory/MEMORY.md) — consult relevant topic files before substantial work. Trust [VERIFIED] claims; treat [READ] as source-dependent and [INFERRED] as hypotheses to re-check:"
  head -c 8192 "$MEM" 2>/dev/null | head -100

  # Staleness gap analysis: how much has the repo moved since memory was last fed?
  last_mem="$(grep -rhoE '\[20[0-9]{2}-[0-9]{2}-[0-9]{2}' "$UG/memory" 2>/dev/null | tr -d '[' | sort | tail -1)"
  if [ -n "$last_mem" ]; then
    commits_since="$(git -C "$ROOT" rev-list --count --since="$last_mem" HEAD 2>/dev/null)"
    case "$commits_since" in '' | *[!0-9]*) commits_since=0 ;; esac
    if [ "$commits_since" -ge 20 ]; then
      echo "Staleness warning: the newest memory entry is from $last_mem, but the repo has $commits_since commits since then. Claims about touched areas may be outdated — re-verify before relying on them, and consider /ultragoal:compact."
    fi
  fi
fi

if [ "$s" -ge 10 ]; then
  echo "Memory upkeep: $s sessions since the last compaction — when convenient, suggest /ultragoal:compact to the user."
fi

echo "</ultragoal-context>"
exit 0
