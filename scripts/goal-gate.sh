#!/usr/bin/env bash
# ultragoal goal gate — runs as a Stop hook after every turn.
#
# Goals are per-session: each lives in .ultragoal/goals/active/<slug>/goal.md
# and carries the id of the session that armed it. The gate enforces only THIS
# session's goal, so different sessions can run different goals in the same repo
# concurrently, and a session with no goal is never blocked.
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
[ -d "$UG/goals" ] || exit 0

# ---- which session is stopping? --------------------------------------------
payload=""
if [ ! -t 0 ]; then payload="$(cat 2>/dev/null)"; fi
sid="$(printf '%s' "$payload" | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"

read_field() { sed -n "s/^$2:[[:space:]]*//p" "$1" 2>/dev/null | head -1 | tr -d '[:space:]'; }

# ---- find THIS session's active goal ---------------------------------------
# New model: active/<slug>/goal.md. Legacy fallback: a single active.md.
GOAL=""; GDIR=""
if [ -d "$UG/goals/active" ]; then
  for gf in "$UG/goals/active"/*/goal.md; do
    [ -r "$gf" ] || continue
    [ "$(read_field "$gf" status)" = "active" ] || continue
    gsid="$(read_field "$gf" session)"
    if [ -z "$gsid" ] || { [ -n "$sid" ] && [ "$gsid" = "$sid" ]; }; then
      GOAL="$gf"; GDIR="$(dirname "$gf")"; break
    fi
  done
fi
if [ -z "$GOAL" ] && [ -r "$UG/goals/active.md" ]; then   # legacy single-file goal
  if [ "$(read_field "$UG/goals/active.md" status)" = "active" ]; then
    gsid="$(read_field "$UG/goals/active.md" session)"
    if [ -z "$gsid" ] || { [ -n "$sid" ] && [ "$gsid" = "$sid" ]; }; then
      GOAL="$UG/goals/active.md"; GDIR="$UG/goals"
    fi
  fi
fi
if [ -z "$GOAL" ]; then
  # A goal can be marked done without its bookkeeping (stats row, archive move) —
  # e.g. when the work finished inside the first turn and no gate message ever
  # landed. Nudge exactly once per goal, then stay out of the way: fail open.
  if [ -d "$UG/goals/active" ]; then
    for gf in "$UG/goals/active"/*/goal.md; do
      [ -r "$gf" ] || continue
      [ "$(read_field "$gf" status)" = "done" ] || continue
      gsid="$(read_field "$gf" session)"
      if [ -n "$gsid" ] && { [ -z "$sid" ] || [ "$gsid" != "$sid" ]; }; then continue; fi
      gd="$(dirname "$gf")"
      [ -e "$gd/.archive-nudged" ] && continue
      : > "$gd/.archive-nudged" 2>/dev/null || continue
      dslug="$(read_field "$gf" slug)"; [ -n "$dslug" ] || dslug="$(basename "$gd")"
      cat >&2 <<EOF
ULTRAGOAL GATE — goal "$dslug" is done but still sitting in goals/active/. Finish the bookkeeping, then stop:
1. If lessons were not yet distilled into .ultragoal/memory/, do that first (ultragoal:remember).
2. Append its row to .ultragoal/stats.tsv (tab-separated; create with header "date	slug	kind	outcome	turns	verifier_fails	budget" if missing).
3. Move $gf to .ultragoal/goals/archive/$dslug.md and remove $gd.
EOF
      exit 2
    done
  fi
  exit 0
fi

budget="$(read_field "$GOAL" budget)"
case "$budget" in '' | *[!0-9]*) budget=25 ;; esac
slug="$(read_field "$GOAL" slug)"; [ -n "$slug" ] || slug="active goal"
kind="$(read_field "$GOAL" kind)"; [ -n "$kind" ] || kind="task"
verify="$(read_field "$GOAL" verify)"; [ "$verify" = "off" ] || verify="on"

# ---- rubric integrity (hash frozen at arm; change invalidates verdicts) -----
hash_file="$GDIR/.rubric-hash"
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
turns_file="$GDIR/.turns"
turns=0
[ -r "$turns_file" ] && turns="$(tr -dc '0-9' < "$turns_file" 2>/dev/null)"
case "$turns" in '') turns=0 ;; esac
turns=$((turns + 1))
printf '%s' "$turns" > "$turns_file" 2>/dev/null || true

# Budget exhausted: nudge once, then auto-pause so state and behavior can't diverge.
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

# evidence ledger: every checked box should carry an evidence line beneath it
no_evid="$(printf '%s\n' "$rubric" | awk '
  /^[[:space:]]*- \[x\]/ { if (pend) miss++; pend=1; next }
  pend { if ($0 !~ /evidence:/) miss++; pend=0 }
  END { if (pend) miss++; print miss+0 }' 2>/dev/null)"
case "$no_evid" in '' | *[!0-9]*) no_evid=0 ;; esac

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
    if [ "$no_evid" -gt 0 ]; then
      echo "$no_evid checked rubric item(s) have no evidence line. Under each checked box record \"  - evidence: \\\`command\\\` -> key output\" — the verifier treats a checked box without evidence as an automatic FAIL."
    fi
    if [ "$kind" = "experiment" ]; then
      cat <<'EOF'
Experiment protocol (the ratchet):
- The measure command is immutable — never edit it, the eval data, or anything it depends on.
- One change per experiment: edit, git commit, run the measure command, read the number.
- Strictly better than best-so-far → keep the commit and advance. Equal or worse → git reset back. Crash → log it and move on after at most a couple of fix attempts.
- Record every attempt in results.tsv (beside this goal file) — commit, metric, status keep/discard/crash, one-line description — including the failures.
- Prefer simple: a tiny gain that adds ugly complexity is not worth it; an equal result from deleting code is a keep.
- Out of ideas? Re-read the code for unexplored angles, combine previous near-misses, then try something structurally different. Several stale experiments in a row means change approach, not parameters.
EOF
    else
      echo 'Protocol:'
      echo '- Never check a rubric box without evidence from a command you ran this session.'
      if [ "$verify" = "off" ]; then
        echo '- Verification is OFF for this goal: your own command evidence suffices to check a box — the evidence must still be real and from this session.'
      else
        echo '- Record evidence under each box as you check it, then dispatch the ultragoal:verifier subagent (fresh context) before finishing: it re-runs every check itself and appends its verdict to the goal file. Dispatch it earlier only for an item that already failed once or whose check looks shaky (or if config sets verification-cadence to every-claim). Only a valid PASS verdict bound to the current rubric completes the goal.'
      fi
      echo '- Log structural decisions and dead ends in the Decision journal as you go.'
      echo '- A stop condition in the goal file being met counts: set "status: paused", report honestly, and stop.'
    fi
    echo "You are operating autonomously toward this goal. For reversible actions that serve it, proceed without asking. If a user correction surfaces, write it to memory immediately — it is the highest-confidence signal you will receive. You have ample context remaining: do not stop, summarize, or suggest a new session on account of context limits. If you are blocked on input only the user can provide, set \"status: paused\" with a note and stop. (This goal's files are in $GDIR.)"
  } >&2
  exit 2
fi

# ---- rubric verified: enforce distillation, then release --------------------
cat >&2 <<EOF
ULTRAGOAL GATE — rubric complete and independently verified. Final steps before you finish:
1. Distill lessons into .ultragoal/memory/ (use the ultragoal:remember skill): verified facts, patterns that worked, dead ends to avoid — with provenance tags and evidence.
2. Append a row to .ultragoal/stats.tsv (tab-separated; create with header "date	slug	kind	outcome	turns	verifier_fails	budget" if missing): today's date, "$slug", "$kind", "done", turns used ($turns), the count of FAIL verdicts in the goal file, and $budget.
3. Move $GOAL to .ultragoal/goals/archive/$slug.md (set "status: done" in it) and remove $GDIR.
4. Then report the outcome to the user. You have been working without them watching — your final message is their first look at any of it. Write it as a re-grounding: the outcome first, evidence for each rubric item, the two or three diffs most worth reading with their own eyes (verification proves the work passes; reading is how they keep understanding it), then the one or two things you need from them, each explained as if new. Leave behind the vocabulary you built up while working unless you re-introduce it.
EOF
exit 2
