#!/usr/bin/env bash
# ultragoal arm guard — runs as a PreToolUse hook on AskUserQuestion.
#
# The recap-before-arming rule failed three times as prose, so it is now a gate:
# the goal skill writes the spec as `status: draft` and shows the recap BEFORE
# asking to arm, and the arm question (header exactly "Arm goal") stands alone.
# This hook blocks an arm question when either condition is unmet.
#
# Invariant: FAIL OPEN. Anything unexpected exits 0; only a confidently
# detected violation blocks (exit 2 with the reason on stderr).

payload=""
if [ ! -t 0 ]; then payload="$(cat 2>/dev/null)"; fi
[ -n "$payload" ] || exit 0

# Only act on the standardized arm question; any other question passes untouched.
printf '%s' "$payload" | grep -q '"header"[[:space:]]*:[[:space:]]*"Arm goal"' || exit 0

# ---- locate the .ultragoal root (walk up, same as the other scripts) --------
start="${CLAUDE_PROJECT_DIR:-$PWD}"
ROOT="$start"
d="$start"
while [ -n "$d" ] && [ "$d" != "/" ] && [ "$d" != "$HOME" ]; do
  if [ -d "$d/.ultragoal" ]; then ROOT="$d"; break; fi
  d="$(dirname "$d")"
done
UG="$ROOT/.ultragoal"
[ -d "$UG" ] || exit 0

# Rule 1: the arm question stands alone — never bundled into an interview batch.
headers="$(printf '%s' "$payload" | grep -o '"header"' | wc -l | tr -d '[:space:]')"
if [ "${headers:-1}" -gt 1 ]; then
  cat >&2 <<'EOF'
ULTRAGOAL ARM GUARD — the arm question must stand alone, never bundled with interview questions. Finish the interview first, write the spec to .ultragoal/goals/active/<slug>/goal.md with "status: draft", show the recap (what you understood, key decisions, the plan, what it will take, how done is defined), and THEN ask the single "Arm goal" question in the same message as the recap.
EOF
  exit 2
fi

# Rule 2: a draft spec must exist before asking to arm — the recap is read
# back from a real artifact, not improvised.
for gf in "$UG/goals/active"/*/goal.md; do
  [ -r "$gf" ] || continue
  if sed -n 's/^status:[[:space:]]*//p' "$gf" 2>/dev/null | head -1 | grep -q '^draft'; then
    exit 0
  fi
done

cat >&2 <<'EOF'
ULTRAGOAL ARM GUARD — no draft spec exists yet. Before asking to arm: write the full spec to .ultragoal/goals/active/<slug>/goal.md with "status: draft" in the frontmatter, then show the user the recap built from that draft (what you understood, key decisions, the plan, what it will take in turns and dispatches, how done is defined), and ask the standalone "Arm goal" question in the same message. On yes, flip status: draft to active and write .turns.
EOF
exit 2
