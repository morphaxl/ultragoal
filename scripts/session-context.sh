#!/usr/bin/env bash
# ultragoal session context — runs as a SessionStart hook.
# Shows THIS session's active goal (if any), notes goals other sessions are
# running, injects the memory index head, warns on staleness, and nudges
# compaction when due. Prints nothing for projects that don't use ultragoal.
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

payload=""
if [ ! -t 0 ]; then payload="$(cat 2>/dev/null)"; fi
sid="$(printf '%s' "$payload" | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
read_field() { sed -n "s/^$2:[[:space:]]*//p" "$1" 2>/dev/null | head -1 | tr -d '[:space:]'; }

# session counter (drives the ~10-session compaction cadence)
mkdir -p "$UG/memory" 2>/dev/null
sess_file="$UG/memory/.sessions"
s=0; [ -r "$sess_file" ] && s="$(tr -dc '0-9' < "$sess_file" 2>/dev/null)"
case "$s" in '') s=0 ;; esac
s=$((s + 1)); printf '%s' "$s" > "$sess_file" 2>/dev/null || true

echo "<ultragoal-context>"

mine=""; mine_dir=""; others=0
if [ -d "$UG/goals/active" ]; then
  for gf in "$UG/goals/active"/*/goal.md; do
    [ -r "$gf" ] || continue
    [ "$(read_field "$gf" status)" = "active" ] || continue
    gsid="$(read_field "$gf" session)"
    if [ -z "$mine" ] && { [ -z "$gsid" ] || { [ -n "$sid" ] && [ "$gsid" = "$sid" ]; }; }; then
      mine="$gf"; mine_dir="$(dirname "$gf")"
    else
      others=$((others + 1))
    fi
  done
fi
# legacy single-file goal
if [ -z "$mine" ] && [ -r "$UG/goals/active.md" ] && [ "$(read_field "$UG/goals/active.md" status)" = "active" ]; then
  mine="$UG/goals/active.md"; mine_dir="$UG/goals"
fi

if [ -n "$mine" ]; then
  slug="$(read_field "$mine" slug)"; budget="$(read_field "$mine" budget)"
  turns=0; [ -r "$mine_dir/.turns" ] && turns="$(tr -dc '0-9' < "$mine_dir/.turns" 2>/dev/null)"
  echo "ACTIVE GOAL (this session): \"$slug\" — turn ${turns:-0} of ${budget:-25}, in $mine. The loop is armed: resume working toward its rubric. /ultragoal:status for details, /ultragoal:stop to abandon."
fi
if [ "$others" -gt 0 ]; then
  echo "$others other goal(s) are active in OTHER sessions of this repo — the gate does not enforce them here, so you are free to work on this session's goal (or none). /ultragoal:status lists them."
fi

MEM="$UG/memory/MEMORY.md"
if [ -r "$MEM" ]; then
  echo "Project memory index ($UG/memory/MEMORY.md) — consult relevant topic files before substantial work. Trust [VERIFIED] claims; treat [READ] as source-dependent and [INFERRED] as hypotheses to re-check:"
  head -c 8192 "$MEM" 2>/dev/null | head -100

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
  evidence="$(grep -h '^\[20' "$UG/memory"/*.md 2>/dev/null | grep -c . 2>/dev/null)"
  case "$evidence" in '' | *[!0-9]*) evidence=0 ;; esac
  if [ "$evidence" -gt 0 ]; then
    echo "Memory upkeep: $s sessions since the last compaction — when convenient, suggest /ultragoal:compact to the user."
  else
    echo "Memory upkeep: $s sessions in and the project memory has no evidence entries yet — lessons are being lost. Goal completions distill automatically; after substantive NON-goal work, run the ultragoal:remember protocol (or suggest it to the user). A repo with history can also be seeded once via ultragoal:setup's memory bootstrap. Compaction isn't needed until memory has content."
  fi
fi

echo "</ultragoal-context>"
exit 0
