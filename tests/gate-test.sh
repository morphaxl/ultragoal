#!/usr/bin/env bash
# Regression tests for scripts/goal-gate.sh and scripts/session-context.sh.
# Plain POSIX-ish shell on purpose: zero dependencies, runs anywhere bash does.
set -u

HERE="$(cd "$(dirname "$0")/.." && pwd)"
GATE="$HERE/scripts/goal-gate.sh"
CTX="$HERE/scripts/session-context.sh"
PASS=0; FAIL=0

check() { # name expected_exit actual_exit [grep_pattern] [grep_file]
  name="$1"; want="$2"; got="$3"; pat="${4:-}"; file="${5:-}"
  ok=1
  [ "$want" = "$got" ] || ok=0
  if [ -n "$pat" ] && [ -n "$file" ]; then
    grep -q "$pat" "$file" || ok=0
  fi
  if [ "$ok" = 1 ]; then PASS=$((PASS+1)); echo "  ok: $name"
  else FAIL=$((FAIL+1)); echo "  FAIL: $name (want exit $want, got $got${pat:+; pattern '$pat'})"
  fi
}

fresh() { # new sandbox; sets T, UG, GOAL
  T="$(mktemp -d)"; export CLAUDE_PROJECT_DIR="$T"
  UG="$T/.ultragoal"; GOAL="$UG/goals/active.md"
  mkdir -p "$UG/goals" "$UG/memory"
}

goalfile() { # status kind budget session verify
  cat > "$GOAL" <<EOF
---
slug: t
status: ${1:-active}
kind: ${2:-task}
budget: ${3:-25}
session: ${4:-}
verify: ${5:-on}
created: 2026-06-10
---
# Rubric
- [ ] item one — check: \`true\`
- [ ] VERIFIER: sign-off
# Stop conditions
- none
EOF
}

run_gate() { # [session_id] -> sets RC, ERR
  ERR="$T/err.txt"
  printf '{"session_id":"%s","stop_hook_active":false}' "${1:-s1}" | "$GATE" 2>"$ERR"
  RC=$?
}

rubric_hash() { awk '/^#[[:space:]]+Rubric/{f=1; next} /^#[[:space:]]/{f=0} f' "$GOAL" | cksum | cut -d' ' -f1; }
check_all_boxes() { tmp="$GOAL.t"; sed 's/- \[ \]/- [x]/' "$GOAL" > "$tmp" && mv "$tmp" "$GOAL"; }

echo "goal-gate.sh"

fresh; run_gate; check "no .ultragoal -> open" 0 "$RC"

fresh; printf 'garbage\nnot frontmatter\n' > "$GOAL"; run_gate
check "garbage goal file -> fail open" 0 "$RC"

fresh; goalfile active task 25 ""; run_gate
check "active+unchecked (legacy, no session) -> block" 2 "$RC" "still active" "$ERR"

fresh; goalfile active task 25 "s1"; run_gate "s1"
check "bound session -> block" 2 "$RC" "Remaining rubric" "$ERR"
run_gate "s2"; check "OTHER session -> open (no hijack)" 0 "$RC"

fresh; goalfile paused; run_gate; check "paused -> open" 0 "$RC"

fresh; goalfile active experiment; run_gate
check "experiment kind -> ratchet protocol" 2 "$RC" "ratchet" "$ERR"

fresh; goalfile active; check_all_boxes; run_gate
check "checked, no verdict -> block" 2 "$RC" "no valid verification" "$ERR"

fresh; goalfile active; check_all_boxes; run_gate  # seed hash file
H="$(rubric_hash)"
printf '\nULTRAGOAL-VERIFIED: PASS rubric=%s\n' "$H" >> "$GOAL"; run_gate
check "valid current PASS -> distill step" 2 "$RC" "Distill" "$ERR"

printf 'ULTRAGOAL-VERIFIED: FAIL rubric=%s — broke\n' "$H" >> "$GOAL"; run_gate
check "later FAIL beats older PASS" 2 "$RC" "no valid verification" "$ERR"

fresh; goalfile active; check_all_boxes; run_gate
printf '\nULTRAGOAL-VERIFIED: PASS rubric=999999\n' >> "$GOAL"; run_gate
check "PASS with stale rubric hash -> block" 2 "$RC" "no valid verification" "$ERR"

fresh; goalfile active; run_gate
tmp="$GOAL.t"; sed 's/item one/item ONE CHANGED/' "$GOAL" > "$tmp" && mv "$tmp" "$GOAL"; run_gate
check "rubric change -> integrity note" 2 "$RC" "Rubric section changed" "$ERR"
run_gate; grep -q "Rubric section changed" "$ERR" && check "integrity note repeats" 1 0 || check "integrity note fires once" 2 "$RC"

fresh; goalfile active task 25 "" off; run_gate
check "verify off + unchecked -> still blocks" 2 "$RC" "Verification is OFF" "$ERR"
check_all_boxes; run_gate
check "verify off + all checked -> distill, no verdict needed" 2 "$RC" "Distill" "$ERR"
grep -q "no valid verification" "$ERR" && check "verify off skips verdict demand" 0 1 || check "verify off skips verdict demand" 0 0

fresh; goalfile active task 1; run_gate           # turn 1: normal block
run_gate; check "turn budget+1 -> nudge" 2 "$RC" "budget reached" "$ERR"
run_gate; check "past nudge -> open" 0 "$RC"
grep -q '^status: paused' "$GOAL" && check "zombie goal auto-paused" 0 0 || check "zombie goal auto-paused" 0 1
run_gate; check "paused stays open" 0 "$RC"

fresh; goalfile active; mkdir -p "$T/sub/inner"; export CLAUDE_PROJECT_DIR="$T/sub/inner"; run_gate
check "walk-up finds workspace root" 2 "$RC" "still active" "$ERR"
export CLAUDE_PROJECT_DIR="$T"

echo "session-context.sh"

fresh
goalfile active task 25 "other-session"
printf '# Memory index\n- [facts.md] x\n' > "$UG/memory/MEMORY.md"
OUT="$(printf '{"session_id":"me"}' | "$CTX")"; RC=$?
check "ctx exits 0" 0 "$RC"
echo "$OUT" | grep -q "armed by another session" && check "ctx: other-session banner" 0 0 || check "ctx: other-session banner" 0 1
echo "$OUT" | grep -q 'session: me' && check "ctx: rebind hint has my id" 0 0 || check "ctx: rebind hint has my id" 0 1

printf '# x\n---\n## Evidence log\n[2026-01-01 S1] old\n' > "$UG/memory/facts.md"
( cd "$T" && git init -q && git -c user.name=t -c user.email=t@t commit -q --allow-empty -m a && for i in $(seq 1 25); do git -c user.name=t -c user.email=t@t commit -q --allow-empty -m "c$i"; done )
OUT="$(printf '{"session_id":"me"}' | "$CTX")"
echo "$OUT" | grep -q "Staleness warning" && check "ctx: staleness warning" 0 0 || check "ctx: staleness warning" 0 1

echo
echo "passed: $PASS  failed: $FAIL"
[ "$FAIL" = 0 ] || exit 1
