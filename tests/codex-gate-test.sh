#!/usr/bin/env bash
set -u

HERE="$(cd "$(dirname "$0")/.." && pwd)"
GATE="$HERE/plugins/ultragoal-codex/scripts/codex-goal-gate.sh"
PASS=0; FAIL=0

check() {
  name="$1"; want="$2"; got="$3"; pat="${4:-}"; file="${5:-}"
  ok=1
  [ "$want" = "$got" ] || ok=0
  if [ -n "$pat" ] && [ -n "$file" ]; then grep -q "$pat" "$file" || ok=0; fi
  if [ "$ok" = 1 ]; then PASS=$((PASS+1)); echo "  ok: $name"; else FAIL=$((FAIL+1)); echo "  FAIL: $name (want $want got $got${pat:+; pattern '$pat'})"; fi
}

fresh() {
  T="$(mktemp -d)"
  UG="$T/.ultragoal"
  mkdir -p "$UG/codex-goals/t"
  GOAL="$UG/codex-goals/t/goal.md"
}

write_goal() {
  cat > "$GOAL" <<EOF
---
slug: t
type: codex-goal
status: ${1:-active}
codex_goal: active
verify: ${2:-panel}
budget: ${3:-25}
created: 2026-06-17
---
# Rubric
- [ ] item one - check: \`true\` exits 0
- [ ] VERIFIER: independent panel sign-off recorded in the Verification log
# Stop conditions
- budget
# Verification log
EOF
}

run_gate() {
  ERR="$T/err.txt"
  (cd "$T" && printf '{"thread_id":"codex-test"}' | sh "$GATE" 2>"$ERR")
  RC=$?
}

rubric_hash() {
  awk '/^#[[:space:]]+Rubric/{f=1; next} /^#[[:space:]]/{f=0} f' "$GOAL" | sed 's/^\( *- \)\[[xX ]\]/\1[ ]/' | awk '
  /^[[:space:]]*- evidence:/ { inev=1; next }
  inev && ($0 ~ /^[[:space:]]*- \[/ || $0 ~ /^[[:space:]]*- check:/ || $0 ~ /^[^[:space:]]/) { inev=0 }
  inev { next }
  { print }' | cksum | cut -d' ' -f1
}

check_all_with_evidence() {
  awk '/^[[:space:]]*- \[ \]/ { sub("- \\[ \\]", "- [x]"); print; print "  - evidence: `true` -> ok"; next } { print }' "$GOAL" > "$GOAL.tmp" && mv "$GOAL.tmp" "$GOAL"
}

echo "codex-goal-gate.sh"

T="$(mktemp -d)"
(cd "$T" && printf '{}' | sh "$GATE" 2>/tmp/ug-empty.err)
check "no .ultragoal -> open" 0 "$?"
rm -rf "$T"

fresh; write_goal active panel; run_gate
check "unchecked rubric blocks" 2 "$RC" "Remaining rubric" "$ERR"

fresh; write_goal active panel; sed 's/- \[ \]/- [x]/g' "$GOAL" > "$GOAL.tmp" && mv "$GOAL.tmp" "$GOAL"; run_gate
check "checked without evidence blocks" 2 "$RC" "no evidence line" "$ERR"

fresh; write_goal active panel; check_all_with_evidence; run_gate
check "missing panel blocks" 2 "$RC" "panel verification is incomplete" "$ERR"

fresh; write_goal active panel; check_all_with_evidence; run_gate; H="$(rubric_hash)"
printf '\nULTRAGOAL-VERIFIED: PASS rubric=%s lens=checks\n' "$H" >> "$GOAL"
printf 'ULTRAGOAL-VERIFIED: PASS rubric=%s lens=refute\n' "$H" >> "$GOAL"
run_gate
check "partial panel blocks" 2 "$RC" "constraints" "$ERR"

printf 'ULTRAGOAL-VERIFIED: PASS rubric=%s lens=constraints\n' "$H" >> "$GOAL"
run_gate
check "panel PASS reaches distill nudge" 2 "$RC" "rubric complete" "$ERR"

fresh; write_goal active panel; sed 's/- \[ \]/- [x]/g' "$GOAL" > "$GOAL.tmp" && mv "$GOAL.tmp" "$GOAL"; H="$(rubric_hash)"
printf '\nULTRAGOAL-VERIFIED: PASS rubric=%s lens=checks\n' "$H" >> "$GOAL"
printf 'ULTRAGOAL-VERIFIED: PASS rubric=%s lens=refute\n' "$H" >> "$GOAL"
printf 'ULTRAGOAL-VERIFIED: PASS rubric=%s lens=constraints\n' "$H" >> "$GOAL"
run_gate
check "panel PASS without evidence still blocks" 2 "$RC" "no evidence line" "$ERR"

fresh; write_goal active panel 1; run_gate; run_gate
check "budget first overage warns" 2 "$RC" "budget reached" "$ERR"
run_gate
check "budget second overage pauses" 2 "$RC" "paused" "$ERR"
grep -q '^status: paused' "$GOAL" && check "budget wrote paused status" 0 0 || check "budget wrote paused status" 0 1

fresh; write_goal paused panel; run_gate
check "paused goal opens" 0 "$RC"

fresh; write_goal active off; check_all_with_evidence; run_gate
check "verify off releases to distill nudge" 2 "$RC" "rubric complete" "$ERR"

echo "passed: $PASS; failed: $FAIL"
[ "$FAIL" -eq 0 ]
