#!/usr/bin/env sh
# ultragoal Codex goal gate — runs as a Codex Stop hook.
#
# Invariant: FAIL OPEN. Any unexpected state exits 0. A normal block exits 2
# with stderr instructions, matching the Claude gate contract when Codex honors
# Stop-hook blocking. The headless Codex runner still works when hooks are only
# advisory by reading the same goal files and verifier contract.

start="${PWD:-.}"
d="$start"
ROOT=""
while [ -n "$d" ] && [ "$d" != "/" ] && [ "$d" != "$HOME" ]; do
  if [ -d "$d/.ultragoal" ]; then ROOT="$d"; break; fi
  d=$(dirname "$d")
done
[ -n "$ROOT" ] || exit 0

UG="$ROOT/.ultragoal"
[ -d "$UG" ] || exit 0

payload=""
if [ ! -t 0 ]; then payload=$(cat 2>/dev/null); fi
sid=$(printf '%s' "$payload" | sed -n 's/.*"\(thread_id\|threadId\|session_id\)"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\2/p' | head -1)

read_field() {
  sed -n "s/^$2:[[:space:]]*//p" "$1" 2>/dev/null | head -1 | tr -d '[:space:]'
}

goal_matches_session() {
  gf="$1"
  gsid=$(read_field "$gf" session)
  [ -n "$gsid" ] || gsid=$(read_field "$gf" codex_thread)
  [ -n "$gsid" ] || return 0
  [ -n "$sid" ] && [ "$gsid" = "$sid" ]
}

GOAL=""
GDIR=""

if [ -d "$UG/goals/active" ]; then
  for gf in "$UG/goals/active"/*/goal.md; do
    [ -r "$gf" ] || continue
    [ "$(read_field "$gf" status)" = "active" ] || continue
    goal_matches_session "$gf" || continue
    GOAL="$gf"; GDIR=$(dirname "$gf"); break
  done
fi

if [ -z "$GOAL" ] && [ -d "$UG/codex-goals" ]; then
  for gf in "$UG/codex-goals"/*/goal.md; do
    [ -r "$gf" ] || continue
    [ "$(read_field "$gf" status)" = "active" ] || continue
    cg=$(read_field "$gf" codex_goal)
    [ -z "$cg" ] || [ "$cg" = "active" ] || continue
    goal_matches_session "$gf" || continue
    GOAL="$gf"; GDIR=$(dirname "$gf"); break
  done
fi

if [ -z "$GOAL" ]; then
  # A completed Codex goal left in place gets one bookkeeping nudge.
  for base in "$UG/goals/active" "$UG/codex-goals"; do
    [ -d "$base" ] || continue
    for gf in "$base"/*/goal.md; do
      [ -r "$gf" ] || continue
      [ "$(read_field "$gf" status)" = "done" ] || continue
      goal_matches_session "$gf" || continue
      gd=$(dirname "$gf")
      [ -e "$gd/.archive-nudged" ] && continue
      : > "$gd/.archive-nudged" 2>/dev/null || continue
      dslug=$(read_field "$gf" slug); [ -n "$dslug" ] || dslug=$(basename "$gd")
      cat >&2 <<EOF
ULTRAGOAL CODEX GATE — goal "$dslug" is done but still active. Finish bookkeeping, then stop:
1. Distill durable lessons into .ultragoal/memory/ if any.
2. Append a row to .ultragoal/stats.tsv if this repo tracks stats.
3. Archive or mark the goal complete so future Codex sessions do not enforce it.
EOF
      exit 2
    done
  done
  exit 0
fi

slug=$(read_field "$GOAL" slug); [ -n "$slug" ] || slug=$(basename "$GDIR")
kind=$(read_field "$GOAL" kind); [ -n "$kind" ] || kind=$(read_field "$GOAL" type); [ -n "$kind" ] || kind="task"
verify=$(read_field "$GOAL" verify)
case "$verify" in off|panel) ;; *) verify="on" ;; esac

budget=$(read_field "$GOAL" budget)
case "$budget" in ''|*[!0-9]*) budget=25 ;; esac

hash_file="$GDIR/.rubric-hash"
rubric_hash=$(awk '/^#[[:space:]]+Rubric/{f=1; next} /^#[[:space:]]/{f=0} f' "$GOAL" 2>/dev/null | sed 's/^\( *- \)\[[xX ]\]/\1[ ]/' 2>/dev/null | awk '
  /^[[:space:]]*- evidence:/ { inev=1; next }
  inev && ($0 ~ /^[[:space:]]*- \[/ || $0 ~ /^[[:space:]]*- check:/ || $0 ~ /^[^[:space:]]/) { inev=0 }
  inev { next }
  { print }' 2>/dev/null | cksum 2>/dev/null | cut -d' ' -f1)
integrity_note=""
if [ -n "$rubric_hash" ]; then
  if [ -r "$hash_file" ]; then
    prev_hash=$(tr -dc '0-9' < "$hash_file" 2>/dev/null)
    if [ -n "$prev_hash" ] && [ "$prev_hash" != "$rubric_hash" ]; then
      integrity_note="NOTE: the Rubric section changed since it was armed. Prior verifier verdicts no longer count; re-run verification against rubric=$rubric_hash."
      printf '%s' "$rubric_hash" > "$hash_file" 2>/dev/null || true
    fi
  else
    printf '%s' "$rubric_hash" > "$hash_file" 2>/dev/null || true
  fi
fi

turns_file="$GDIR/.turns"
turns=0
[ -r "$turns_file" ] && turns=$(tr -dc '0-9' < "$turns_file" 2>/dev/null)
case "$turns" in '') turns=0 ;; esac
turns=$((turns + 1))
printf '%s' "$turns" > "$turns_file" 2>/dev/null || true
used_str="turn $turns/$budget"

if [ "$turns" -gt "$budget" ]; then
  warnfile="$GDIR/.budget-warned"
  if [ -e "$warnfile" ]; then
    tmp="$GOAL.tmp.$$"
    if sed 's/^status:[[:space:]]*active/status: paused/' "$GOAL" > "$tmp" 2>/dev/null; then
      mv "$tmp" "$GOAL" 2>/dev/null || rm -f "$tmp" 2>/dev/null
    else
      rm -f "$tmp" 2>/dev/null
    fi
    cat >&2 <<EOF
ULTRAGOAL CODEX GATE — budget warning was not acted on, so goal "$slug" is paused ($used_str). Report current rubric state honestly before stopping.
EOF
    exit 2
  fi
  : > "$warnfile" 2>/dev/null || true
  cat >&2 <<EOF
ULTRAGOAL CODEX GATE — budget reached for "$slug" ($used_str). Either pause and report current rubric state, or deliberately raise the budget and continue.
EOF
  exit 2
fi
rm -f "$GDIR/.budget-warned" 2>/dev/null

rubric=$(awk '/^#[[:space:]]+Rubric/{f=1; next} /^#[[:space:]]/{f=0} f' "$GOAL" 2>/dev/null)
unchecked=$(printf '%s\n' "$rubric" | grep '^[[:space:]]*- \[ \]' 2>/dev/null)
unchecked_count=$(printf '%s' "$unchecked" | grep -c '\[ \]' 2>/dev/null)
case "$unchecked_count" in ''|*[!0-9]*) unchecked_count=0 ;; esac

no_evid=$(printf '%s\n' "$rubric" | awk '
  /^[[:space:]]*- \[[xX ]\]/ { if (checked && !found) miss++; checked=($0 ~ /\[[xX]\]/); found=0; next }
  checked && /evidence:/ { found=1 }
  END { if (checked && !found) miss++; print miss+0 }' 2>/dev/null)
case "$no_evid" in ''|*[!0-9]*) no_evid=0 ;; esac

verified=0
panel_missing=""
if [ "$verify" = "panel" ]; then
  [ -n "$rubric_hash" ] && verified=1
  for lens in checks refute constraints; do
    lv=$(grep 'ULTRAGOAL-VERIFIED:' "$GOAL" 2>/dev/null | grep "lens=$lens" | tail -1)
    case "$lv" in
      *"ULTRAGOAL-VERIFIED: PASS"*"rubric=$rubric_hash"*) ;;
      *) verified=0; panel_missing="$panel_missing $lens" ;;
    esac
  done
else
  last_verdict=$(grep 'ULTRAGOAL-VERIFIED:' "$GOAL" 2>/dev/null | tail -1)
  case "$last_verdict" in
    *"ULTRAGOAL-VERIFIED: PASS"*"rubric=$rubric_hash"*) [ -n "$rubric_hash" ] && verified=1 ;;
  esac
  if [ "$verify" = "off" ] && [ "$unchecked_count" -eq 0 ]; then verified=1; fi
fi

if [ "$unchecked_count" -gt 0 ] || [ "$no_evid" -gt 0 ] || [ "$verified" -ne 1 ]; then
  {
    echo "ULTRAGOAL CODEX GATE — goal \"$slug\" is still active ($used_str). Keep working."
    [ -n "$integrity_note" ] && echo "$integrity_note"
    if [ "$unchecked_count" -gt 0 ]; then
      echo "Remaining rubric items:"
      printf '%s\n' "$unchecked"
    elif [ "$no_evid" -gt 0 ]; then
      echo "$no_evid checked rubric item(s) have no evidence line. Add \"  - evidence: \`command\` -> key output\" under each checked item."
    elif [ "$verify" = "panel" ]; then
      echo "All boxes are checked, but panel verification is incomplete (missing/stale:$panel_missing). Required: ULTRAGOAL-VERIFIED: PASS rubric=$rubric_hash lens=<checks|refute|constraints> for all three lenses."
    else
      echo "All boxes are checked, but there is no valid verifier PASS bound to rubric=$rubric_hash."
    fi
    if [ "$no_evid" -gt 0 ] && [ "$unchecked_count" -gt 0 ]; then
      echo "$no_evid checked rubric item(s) have no evidence line. Add \"  - evidence: \`command\` -> key output\" under each checked item."
    fi
    echo "Protocol: record command evidence, use fresh verifier/panel sign-off, do not complete native Codex Goal mode until this file proves done. If this hook is advisory in your Codex build, run via: npx ultragoal run --codex --headless \"<brief>\" so the runner resumes against this same contract."
  } >&2
  exit 2
fi

cat >&2 <<EOF
ULTRAGOAL CODEX GATE — rubric complete and independently verified. Before final stop:
1. Distill durable lessons into .ultragoal/memory/ if the run learned anything reusable.
2. Append/update .ultragoal/stats.tsv if this repo tracks stats.
3. Set status: done and archive or leave a clear completion note in $GOAL.
4. Report outcome, verification evidence, and usage instructions to the user.
EOF
exit 2
