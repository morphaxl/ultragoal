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

kind="$(sed -n 's/^kind:[[:space:]]*//p' "$GOAL" 2>/dev/null | head -1 | tr -d '[:space:]')"
[ -n "$kind" ] || kind="task"

# Rubric integrity: the checks are frozen at arm time. A changed rubric is
# allowed (specs are user-editable) but must be surfaced, never silent.
hash_file="$UG/goals/.rubric-hash"
rubric_hash="$(awk '/^#[[:space:]]+Rubric/{f=1; next} /^#[[:space:]]/{f=0} f' "$GOAL" 2>/dev/null | cksum 2>/dev/null | cut -d' ' -f1)"
integrity_note=""
if [ -n "$rubric_hash" ]; then
  if [ -r "$hash_file" ]; then
    prev_hash="$(tr -dc '0-9' < "$hash_file" 2>/dev/null)"
    if [ -n "$prev_hash" ] && [ "$prev_hash" != "$rubric_hash" ]; then
      integrity_note="NOTE: the Rubric section changed since it was armed. If this was a deliberate amendment, record it with a reason in the Decision journal; the verifier must re-check ALL items against the new rubric. Weakening a check to pass it is never acceptable."
      printf '%s' "$rubric_hash" > "$hash_file" 2>/dev/null || true
    fi
  else
    printf '%s' "$rubric_hash" > "$hash_file" 2>/dev/null || true
  fi
fi

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
    [ -n "$integrity_note" ] && echo "$integrity_note"
    if [ "$unchecked_count" -gt 0 ]; then
      echo "Remaining rubric items:"
      printf '%s\n' "$unchecked"
    else
      echo "All rubric boxes are checked, but no independent verification is recorded."
    fi
    if [ "$kind" = "experiment" ]; then
      cat <<'EOF'
Experiment protocol (the ratchet):
- The measure command is immutable — never edit it, the eval data, or anything it depends on.
- One change per experiment: edit, git commit, run the measure command, read the number.
- Strictly better than best-so-far → keep the commit and advance. Equal or worse → git reset back. Crash → log it and move on after at most a couple of fix attempts.
- Record every attempt in results.tsv (commit, metric, status keep/discard/crash, one-line description) — including the failures.
- Prefer simple: a tiny gain that adds ugly complexity is not worth it; an equal result from deleting code is a keep.
- Out of ideas? Re-read the code for unexplored angles, combine previous near-misses, then try something structurally different. Several stale experiments in a row means change approach, not parameters.
EOF
    else
      cat <<'EOF'
Protocol:
- Never check a rubric box without evidence from a command you ran this session.
- Before claiming an item, dispatch the ultragoal:verifier subagent (fresh context); it re-runs the checks itself and appends its verdict to the Verification log. Only a logged "ULTRAGOAL-VERIFIED: PASS" completes the goal.
- Log structural decisions and dead ends in the Decision journal as you go.
- A stop condition in the goal file being met counts: set "status: paused", report honestly, and stop.
EOF
    fi
    echo 'You are operating autonomously toward this goal. For reversible actions that serve it, proceed without asking. If a user correction surfaces, write it to memory immediately — it is the highest-confidence signal you will receive. If you are blocked on input only the user can provide, set "status: paused" with a note and stop.'
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
