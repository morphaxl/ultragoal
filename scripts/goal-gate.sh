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

# ---- locate the .ultragoal root (walk up for monorepos/workspaces) ---------
start="${CLAUDE_PROJECT_DIR:-$PWD}"
ROOT="$start"
d="$start"
while [ -n "$d" ] && [ "$d" != "/" ] && [ "$d" != "$HOME" ]; do
  if [ -d "$d/.ultragoal" ]; then ROOT="$d"; break; fi
  d="$(dirname "$d")"
done
UG="$ROOT/.ultragoal"
GOAL="$UG/goals/active.md"

[ -r "$GOAL" ] || exit 0

# ---- hook payload: which session is stopping? -------------------------------
payload=""
if [ ! -t 0 ]; then payload="$(cat 2>/dev/null)"; fi
sid="$(printf '%s' "$payload" | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"

status="$(sed -n 's/^status:[[:space:]]*//p' "$GOAL" 2>/dev/null | head -1 | tr -d '[:space:]')"
[ "$status" = "active" ] || exit 0

# The gate binds to the session that armed the goal. Other sessions in the
# same repo (side questions, teammates) are left alone; the SessionStart
# banner tells them how to take the goal over (rebind the session: field).
goal_sid="$(sed -n 's/^session:[[:space:]]*//p' "$GOAL" 2>/dev/null | head -1 | tr -d '[:space:]')"
if [ -n "$goal_sid" ] && [ -n "$sid" ] && [ "$goal_sid" != "$sid" ]; then
  exit 0
fi

budget="$(sed -n 's/^budget:[[:space:]]*//p' "$GOAL" 2>/dev/null | head -1 | tr -d '[:space:]')"
case "$budget" in '' | *[!0-9]*) budget=25 ;; esac

slug="$(sed -n 's/^slug:[[:space:]]*//p' "$GOAL" 2>/dev/null | head -1)"
[ -n "$slug" ] || slug="active goal"

kind="$(sed -n 's/^kind:[[:space:]]*//p' "$GOAL" 2>/dev/null | head -1 | tr -d '[:space:]')"
[ -n "$kind" ] || kind="task"

# verify: off — owner opted out of independent verification for this goal.
# Checked boxes (with evidence) and distillation still gate the finish.
verify="$(sed -n 's/^verify:[[:space:]]*//p' "$GOAL" 2>/dev/null | head -1 | tr -d '[:space:]')"
[ "$verify" = "off" ] || verify="on"

# ---- rubric integrity -------------------------------------------------------
# The checks are frozen at arm time. A changed rubric is allowed (specs are
# user-editable) but is surfaced, and it invalidates prior verifier verdicts
# structurally: verdicts carry the rubric hash they were issued against.
hash_file="$UG/goals/.rubric-hash"
rubric_hash="$(awk '/^#[[:space:]]+Rubric/{f=1; next} /^#[[:space:]]/{f=0} f' "$GOAL" 2>/dev/null | cksum 2>/dev/null | cut -d' ' -f1)"
integrity_note=""
if [ -n "$rubric_hash" ]; then
  if [ -r "$hash_file" ]; then
    prev_hash="$(tr -dc '0-9' < "$hash_file" 2>/dev/null)"
    if [ -n "$prev_hash" ] && [ "$prev_hash" != "$rubric_hash" ]; then
      integrity_note="NOTE: the Rubric section changed since it was armed. Prior verifier verdicts no longer count (they are bound to the old rubric hash). If this was a deliberate amendment, record the reason in the Decision journal; the verifier must re-check ALL items. Weakening a check to pass it is never acceptable."
      printf '%s' "$rubric_hash" > "$hash_file" 2>/dev/null || true
    fi
  else
    printf '%s' "$rubric_hash" > "$hash_file" 2>/dev/null || true
  fi
fi

# ---- turn accounting --------------------------------------------------------
turns_file="$UG/goals/.turns"
turns=0
if [ -r "$turns_file" ]; then
  turns="$(tr -dc '0-9' < "$turns_file" 2>/dev/null)"
fi
case "$turns" in '') turns=0 ;; esac
turns=$((turns + 1))
printf '%s' "$turns" > "$turns_file" 2>/dev/null || true

# Budget exhausted: nudge exactly once, then pause the goal and release.
# Flipping status here keeps state and behavior from diverging — no zombie
# "active" goal that the gate no longer enforces.
if [ "$turns" -gt $((budget + 1)) ]; then
  tmp="$GOAL.tmp.$$"
  if sed 's/^status:[[:space:]]*active/status: paused/' "$GOAL" > "$tmp" 2>/dev/null; then
    mv "$tmp" "$GOAL" 2>/dev/null || rm -f "$tmp" 2>/dev/null
  else
    rm -f "$tmp" 2>/dev/null
  fi
  exit 0
fi
if [ "$turns" -gt "$budget" ]; then
  cat >&2 <<EOF
ULTRAGOAL GATE — turn budget reached ($((turns - 1))/$budget) for "$slug".
Do exactly one of the following, then stop:
1. Report honestly where things stand against each rubric item (audit every claim against a tool result from this session), set "status: paused" in the goal file, and tell the user what remains.
2. If you are genuinely close and continuing is clearly justified, raise "budget:" in the goal file and keep working.
If you do neither, the gate will pause the goal itself next turn.
EOF
  exit 2
fi

# ---- rubric + verification state -------------------------------------------
rubric="$(awk '/^#[[:space:]]+Rubric/{f=1; next} /^#[[:space:]]/{f=0} f' "$GOAL" 2>/dev/null)"
unchecked="$(printf '%s\n' "$rubric" | grep '^[[:space:]]*- \[ \]' 2>/dev/null)"
unchecked_count="$(printf '%s' "$unchecked" | grep -c '\[ \]' 2>/dev/null)"
case "$unchecked_count" in '' | *[!0-9]*) unchecked_count=0 ;; esac

# Only the LAST verdict counts, and it must be bound to the CURRENT rubric.
# A PASS from round 1 followed by a FAIL, or a PASS issued against an older
# rubric, does not release the gate.
verified=0
last_verdict="$(grep 'ULTRAGOAL-VERIFIED:' "$GOAL" 2>/dev/null | tail -1)"
case "$last_verdict" in
  *"ULTRAGOAL-VERIFIED: PASS"*"rubric=$rubric_hash"*) [ -n "$rubric_hash" ] && verified=1 ;;
esac
if [ "$verify" = "off" ] && [ "$unchecked_count" -eq 0 ]; then
  verified=1
fi

if [ "$unchecked_count" -gt 0 ] || [ "$verified" -ne 1 ]; then
  {
    echo "ULTRAGOAL GATE — goal \"$slug\" is still active (turn $turns/$budget). Keep working."
    [ -n "$integrity_note" ] && echo "$integrity_note"
    if [ "$unchecked_count" -gt 0 ]; then
      echo "Remaining rubric items:"
      printf '%s\n' "$unchecked"
    else
      echo "All rubric boxes are checked, but there is no valid verification: the last verdict must be exactly \"ULTRAGOAL-VERIFIED: PASS rubric=$rubric_hash\" (issued by the verifier against the current rubric)."
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
      echo 'Protocol:'
      echo '- Never check a rubric box without evidence from a command you ran this session.'
      if [ "$verify" = "off" ]; then
        echo '- Verification is OFF for this goal: your own command evidence suffices to check a box — the evidence must still be real and from this session.'
      else
        echo '- Before claiming an item, dispatch the ultragoal:verifier subagent (fresh context); it re-runs the checks itself and appends its verdict to the goal file. Only a valid PASS verdict bound to the current rubric completes the goal.'
      fi
      echo '- Log structural decisions and dead ends in the Decision journal as you go.'
      echo '- A stop condition in the goal file being met counts: set "status: paused", report honestly, and stop.'
    fi
    echo 'You are operating autonomously toward this goal. For reversible actions that serve it, proceed without asking. If a user correction surfaces, write it to memory immediately — it is the highest-confidence signal you will receive. If you are blocked on input only the user can provide, set "status: paused" with a note and stop.'
  } >&2
  exit 2
fi

# ---- rubric verified: enforce distillation, then release --------------------
cat >&2 <<'EOF'
ULTRAGOAL GATE — rubric complete and independently verified. Final steps before you finish:
1. Distill lessons into .ultragoal/memory/ (use the ultragoal:remember skill): verified facts, patterns that worked, dead ends to avoid — with provenance tags and evidence.
2. Append a row to .ultragoal/stats.tsv (tab-separated; create with header "date	slug	kind	outcome	turns	verifier_fails	budget" if missing): today's date, the slug, the kind, "done", turns used (.ultragoal/goals/.turns), the count of FAIL verdicts in the goal file, and the final budget.
3. Move .ultragoal/goals/active.md to .ultragoal/goals/archive/<slug>.md and set "status: done" in it.
4. Then report the outcome to the user: lead with what was accomplished, evidence for each rubric item, and anything the user should do next.
EOF
exit 2
