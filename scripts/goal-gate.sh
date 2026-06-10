#!/usr/bin/env bash
# ultragoal goal gate — runs as a Stop hook after every turn.
#
# While a goal is active and unfinished, blocks the end of the turn (exit 2)
# and feeds the remaining rubric back to Claude. Releases when the rubric is
# verified and lessons are distilled, when the goal is paused/abandoned, or
# when the turn budget runs out.
#
# Invariant: FAIL OPEN. This script must never be able to trap a session.
# Any unexpected state exits 0.

ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"
UG="$ROOT/.ultragoal"
GOAL="$UG/goals/active.md"

[ -r "$GOAL" ] || exit 0

status="$(sed -n 's/^status:[[:space:]]*//p' "$GOAL" 2>/dev/null | head -1 | tr -d '[:space:]')"
[ "$status" = "active" ] || exit 0

budget="$(sed -n 's/^budget:[[:space:]]*//p' "$GOAL" 2>/dev/null | head -1 | tr -d '[:space:]')"
case "$budget" in '' | *[!0-9]*) budget=25 ;; esac

slug="$(sed -n 's/^slug:[[:space:]]*//p' "$GOAL" 2>/dev/null | head -1)"
[ -n "$slug" ] || slug="active goal"

# ---- turn accounting -------------------------------------------------------
turns_file="$UG/goals/.turns"
turns=0
if [ -r "$turns_file" ]; then
  turns="$(tr -dc '0-9' < "$turns_file" 2>/dev/null)"
fi
case "$turns" in '') turns=0 ;; esac
turns=$((turns + 1))
printf '%s' "$turns" > "$turns_file" 2>/dev/null || true

# Budget exhausted: nudge exactly once, then fail open. (If Claude raises the
# budget in the goal file, normal gating resumes automatically.)
if [ "$turns" -gt $((budget + 1)) ]; then
  exit 0
fi
if [ "$turns" -gt "$budget" ]; then
  cat >&2 <<EOF
ULTRAGOAL GATE — turn budget reached ($((turns - 1))/$budget) for "$slug".
Do exactly one of the following, then stop:
1. Report honestly where things stand against each rubric item (audit every claim against a tool result from this session), set "status: paused" in .ultragoal/goals/active.md, and tell the user what remains.
2. If you are genuinely close and continuing is clearly justified, raise "budget:" in the goal file and keep working.
EOF
  exit 2
fi

# ---- rubric state ----------------------------------------------------------
rubric="$(awk '/^#[[:space:]]+Rubric/{f=1; next} /^#[[:space:]]/{f=0} f' "$GOAL" 2>/dev/null)"
unchecked="$(printf '%s\n' "$rubric" | grep '^[[:space:]]*- \[ \]' 2>/dev/null)"
unchecked_count="$(printf '%s' "$unchecked" | grep -c '\[ \]' 2>/dev/null)"
case "$unchecked_count" in '' | *[!0-9]*) unchecked_count=0 ;; esac

verified=0
grep -q 'ULTRAGOAL-VERIFIED: PASS' "$GOAL" 2>/dev/null && verified=1

if [ "$unchecked_count" -gt 0 ] || [ "$verified" -ne 1 ]; then
  {
    echo "ULTRAGOAL GATE — goal \"$slug\" is still active (turn $turns/$budget). Keep working."
    if [ "$unchecked_count" -gt 0 ]; then
      echo "Remaining rubric items:"
      printf '%s\n' "$unchecked"
    else
      echo "All rubric boxes are checked, but no independent verification is recorded."
    fi
    cat <<'EOF'
Protocol:
- Never check a rubric box without evidence from a command you ran this session.
- Before claiming an item, dispatch the ultragoal:verifier subagent (fresh context); it re-runs the checks itself and appends its verdict to the Verification log. Only a logged "ULTRAGOAL-VERIFIED: PASS" completes the goal.
- Log structural decisions and dead ends in the Decision journal as you go.
- A stop condition in the goal file being met counts: set "status: paused", report honestly, and stop.
You are operating autonomously toward this goal. For reversible actions that serve it, proceed without asking. If you are blocked on input only the user can provide, set "status: paused" with a note and stop.
EOF
  } >&2
  exit 2
fi

# ---- rubric verified: enforce distillation, then release -------------------
cat >&2 <<'EOF'
ULTRAGOAL GATE — rubric complete and independently verified. Final step before you finish:
1. Distill lessons into .ultragoal/memory/ (use the ultragoal:remember skill): verified facts, patterns that worked, dead ends to avoid. Tag with [VERIFIED S<n>] and evidence.
2. Move .ultragoal/goals/active.md to .ultragoal/goals/archive/<slug>.md and set "status: done" in it.
3. Then report the outcome to the user: lead with what was accomplished, evidence for each rubric item, and anything the user should do next.
EOF
exit 2
