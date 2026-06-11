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

fresh() { # new sandbox; sets T, UG; default goal slug "t"
  T="$(mktemp -d)"; export CLAUDE_PROJECT_DIR="$T"
  UG="$T/.ultragoal"
  mkdir -p "$UG/goals/active" "$UG/memory"
  GOAL="$UG/goals/active/t/goal.md"
}

write_goal() { # path status kind budget session verify slug
  local path="$1" slug="${7:-t}"
  mkdir -p "$(dirname "$path")"
  cat > "$path" <<EOF
---
slug: $slug
status: ${2:-active}
kind: ${3:-task}
budget: ${4:-25}
session: ${5:-}
verify: ${6:-on}
created: 2026-06-10
---
# Rubric
- [ ] item one — check: \`true\`
- [ ] VERIFIER: sign-off
# Stop conditions
- none
EOF
}

goalfile() { # status kind budget session verify  (per-session goal, slug "t")
  GOAL="$UG/goals/active/t/goal.md"
  write_goal "$GOAL" "${1:-active}" "${2:-task}" "${3:-25}" "${4:-}" "${5:-on}" t
}

legacy_goalfile() { # status session  (old single-file model)
  GOAL="$UG/goals/active.md"
  write_goal "$GOAL" "${1:-active}" task 25 "${2:-}" on t
}

run_gate() { # [session_id] -> sets RC, ERR
  ERR="$T/err.txt"
  printf '{"session_id":"%s","stop_hook_active":false}' "${1:-s1}" | "$GATE" 2>"$ERR"
  RC=$?
}

rubric_hash() { awk '/^#[[:space:]]+Rubric/{f=1; next} /^#[[:space:]]/{f=0} f' "$GOAL" | sed -e 's/^\( *- \)\[[xX ]\]/\1[ ]/' -e '/^ *- evidence:/d' | cksum | cut -d' ' -f1; }
check_all_boxes() { tmp="$GOAL.t"; sed 's/- \[ \]/- [x]/' "$GOAL" > "$tmp" && mv "$tmp" "$GOAL"; }

echo "goal-gate.sh"

fresh; run_gate; check "no .ultragoal -> open" 0 "$RC"

fresh; mkdir -p "$(dirname "$GOAL")"; printf 'garbage\nnot frontmatter\n' > "$GOAL"; run_gate
check "garbage goal file -> fail open" 0 "$RC"

fresh; legacy_goalfile active ""; run_gate
check "legacy active.md (no session) -> block" 2 "$RC" "still active" "$ERR"

fresh; goalfile active task 25 "s1"; run_gate "s1"
check "bound session -> block" 2 "$RC" "Remaining rubric" "$ERR"
run_gate "s2"; check "OTHER session -> open (no hijack)" 0 "$RC"

# concurrency: two goals, two sessions, same repo
fresh
write_goal "$UG/goals/active/alpha/goal.md" active task 25 "sA" on alpha
write_goal "$UG/goals/active/beta/goal.md"  active task 25 "sB" on beta
run_gate "sA"; check "session A enforces goal alpha" 2 "$RC" "alpha" "$ERR"
run_gate "sB"; check "session B enforces goal beta" 2 "$RC" "beta" "$ERR"
run_gate "sC"; check "session C (no goal) -> open" 0 "$RC"
# each goal's turn counter is independent
ta="$(cat "$UG/goals/active/alpha/.turns" 2>/dev/null)"; tb="$(cat "$UG/goals/active/beta/.turns" 2>/dev/null)"
[ "$ta" = "1" ] && [ "$tb" = "1" ] && check "per-goal turn counters independent" 0 0 || check "per-goal turn counters independent" 0 1

fresh; goalfile paused; run_gate; check "paused -> open" 0 "$RC"

# a goal marked done but left in active/ gets ONE bookkeeping nudge, then opens
fresh; goalfile done; run_gate
check "done in active/ -> bookkeeping nudge" 2 "$RC" "bookkeeping" "$ERR"
run_gate
check "done in active/, already nudged -> open (fail open)" 0 "$RC"
fresh; goalfile done task 25 "sX"; run_gate "s1"
check "done goal of OTHER session -> open" 0 "$RC"

fresh; goalfile active experiment; run_gate
check "experiment kind -> ratchet protocol" 2 "$RC" "ratchet" "$ERR"

fresh; goalfile active; check_all_boxes; run_gate
check "checked, no verdict -> block" 2 "$RC" "no valid verification" "$ERR"
check "checked without evidence -> nagged" 2 "$RC" "no evidence line" "$ERR"
awk '{print} /- \[x\]/ {print "  - evidence: `true` -> ok"}' "$GOAL" > "$GOAL.t" && mv "$GOAL.t" "$GOAL"
run_gate
grep -q "no evidence line" "$ERR" && check "checked WITH evidence -> no nag" 0 1 || check "checked WITH evidence -> no nag" 0 0

fresh; goalfile active; check_all_boxes; run_gate  # seed hash file
H="$(rubric_hash)"
printf '\nULTRAGOAL-VERIFIED: PASS rubric=%s\n' "$H" >> "$GOAL"; run_gate
check "valid current PASS -> distill step" 2 "$RC" "Distill" "$ERR"
grep -q "worth reading" "$ERR" && check "release report names diffs worth reading" 0 0 || check "release report names diffs worth reading" 0 1

printf 'ULTRAGOAL-VERIFIED: FAIL rubric=%s — broke\n' "$H" >> "$GOAL"; run_gate
check "later FAIL beats older PASS" 2 "$RC" "no valid verification" "$ERR"

fresh; goalfile active; check_all_boxes; run_gate
printf '\nULTRAGOAL-VERIFIED: PASS rubric=999999\n' >> "$GOAL"; run_gate
check "PASS with stale rubric hash -> block" 2 "$RC" "no valid verification" "$ERR"

# hash normalization: progress marks never void a verdict; check-text edits do
fresh; goalfile active; run_gate
H="$(rubric_hash)"
printf '\nULTRAGOAL-VERIFIED: PASS rubric=%s\n' "$H" >> "$GOAL"
check_all_boxes; run_gate
check "box flips don't void the verdict -> distill" 2 "$RC" "Distill" "$ERR"
grep -q "Rubric section changed" "$ERR" && check "box flips don't fire integrity note" 0 1 || check "box flips don't fire integrity note" 0 0
awk '{print} /- \[x\]/ {print "  - evidence: \`true\` -> ok"}' "$GOAL" > "$GOAL.t" && mv "$GOAL.t" "$GOAL"; run_gate
check "evidence lines don't void the verdict" 2 "$RC" "Distill" "$ERR"
printf 'ULTRAGOAL-INTERIM: PASS items 1-2 rubric=%s\n' "$H" >> "$GOAL"; run_gate
check "interim lines don't disturb release" 2 "$RC" "Distill" "$ERR"
tmp="$GOAL.t"; sed 's/item one/item one WEAKENED/' "$GOAL" > "$tmp" && mv "$tmp" "$GOAL"; run_gate
check "check-text edit voids the verdict" 2 "$RC" "no valid verification" "$ERR"

fresh; goalfile active; check_all_boxes; run_gate
printf '\nULTRAGOAL-INTERIM: PASS items 1-2 rubric=%s\n' "$(rubric_hash)" >> "$GOAL"; run_gate
check "interim-only verdict does not release" 2 "$RC" "no valid verification" "$ERR"

fresh; goalfile active; run_gate
tmp="$GOAL.t"; sed 's/item one/item ONE CHANGED/' "$GOAL" > "$tmp" && mv "$tmp" "$GOAL"; run_gate
check "rubric change -> integrity note" 2 "$RC" "Rubric section changed" "$ERR"
run_gate; grep -q "Rubric section changed" "$ERR" && check "integrity note repeats" 1 0 || check "integrity note fires once" 2 "$RC"

fresh; goalfile active task 25 "" off; run_gate
check "verify off + unchecked -> still blocks" 2 "$RC" "Verification is OFF" "$ERR"
check_all_boxes; run_gate
check "verify off + all checked -> distill, no verdict needed" 2 "$RC" "Distill" "$ERR"
grep -q "no valid verification" "$ERR" && check "verify off skips verdict demand" 0 1 || check "verify off skips verdict demand" 0 0

fresh; goalfile active task 25 "" panel; run_gate   # unknown verify values coerce to "on"
check "unknown verify value -> treated as on" 2 "$RC" "dispatch the ultragoal:verifier" "$ERR"

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
write_goal "$UG/goals/active/mine/goal.md"   active task 25 "me"     on mine
write_goal "$UG/goals/active/theirs/goal.md" active task 25 "other"  on theirs
printf '# Memory index\n- [facts.md] x\n' > "$UG/memory/MEMORY.md"
OUT="$(printf '{"session_id":"me"}' | "$CTX")"; RC=$?
check "ctx exits 0" 0 "$RC"
echo "$OUT" | grep -q "ACTIVE GOAL (this session): \"mine\"" && check "ctx: shows this session's goal" 0 0 || check "ctx: shows this session's goal" 0 1
echo "$OUT" | grep -q "other goal(s) are active in OTHER sessions" && check "ctx: notes other sessions' goals" 0 0 || check "ctx: notes other sessions' goals" 0 1

printf '# x\n---\n## Evidence log\n[2026-01-01 S1] old\n' > "$UG/memory/facts.md"
( cd "$T" && git init -q && git -c user.name=t -c user.email=t@t commit -q --allow-empty -m a && for i in $(seq 1 25); do git -c user.name=t -c user.email=t@t commit -q --allow-empty -m "c$i"; done )
OUT="$(printf '{"session_id":"me"}' | "$CTX")"
echo "$OUT" | grep -q "Staleness warning" && check "ctx: staleness warning" 0 0 || check "ctx: staleness warning" 0 1

# cadence nudge: compact when memory has evidence, remember when it's empty
printf '11' > "$UG/memory/.sessions"
OUT="$(printf '{"session_id":"me"}' | "$CTX")"
echo "$OUT" | grep -q "suggest /ultragoal:compact" && check "ctx: compact nudge when memory has evidence" 0 0 || check "ctx: compact nudge when memory has evidence" 0 1
rm -f "$UG/memory/facts.md"; printf '11' > "$UG/memory/.sessions"
OUT="$(printf '{"session_id":"me"}' | "$CTX")"
echo "$OUT" | grep -q "no evidence entries yet" && check "ctx: remember nudge when memory empty" 0 0 || check "ctx: remember nudge when memory empty" 0 1

# auto-update: spawns a throttled background update via the claude CLI; the off
# knob and a fresh stamp both suppress it. A fake claude shim records calls.
fresh
mkdir -p "$T/bin" "$T/home"
printf '#!/bin/sh\necho "$*" >> "$HOME/claude-calls.log"\n' > "$T/bin/claude" && chmod +x "$T/bin/claude"
printf '| auto-update | off |\n' > "$UG/config.md"
printf '{"session_id":"me"}' | HOME="$T/home" PATH="$T/bin:$PATH" "$CTX" >/dev/null
sleep 1
[ ! -e "$T/home/claude-calls.log" ] && check "ctx: auto-update off -> nothing spawned" 0 0 || check "ctx: auto-update off -> nothing spawned" 0 1
printf '| auto-update | on |\n' > "$UG/config.md"
printf '{"session_id":"me"}' | HOME="$T/home" PATH="$T/bin:$PATH" "$CTX" >/dev/null
sleep 1
grep -q 'plugin update ultragoal@ultragoal --scope project' "$T/home/claude-calls.log" 2>/dev/null && check "ctx: auto-update on -> project pin update spawned" 0 0 || check "ctx: auto-update on -> project pin update spawned" 0 1
[ -e "$T/home/.claude/ultragoal-update-stamp" ] && check "ctx: auto-update stamps the throttle" 0 0 || check "ctx: auto-update stamps the throttle" 0 1
rm -f "$T/home/claude-calls.log"
printf '{"session_id":"me"}' | HOME="$T/home" PATH="$T/bin:$PATH" "$CTX" >/dev/null
sleep 1
[ ! -e "$T/home/claude-calls.log" ] && check "ctx: fresh stamp throttles repeat updates" 0 0 || check "ctx: fresh stamp throttles repeat updates" 0 1

echo "skill preamble lint"

# Every dynamic !-command in a skill must exit 0 in bash AND zsh on an empty repo —
# zsh aborts the whole command list on an unmatched glob, where bash falls through.
PT="$(mktemp -d)"; export CLAUDE_PROJECT_DIR="$PT"
pre_ok=1
for sk in "$HERE"/skills/*/SKILL.md; do
  cmds="$(awk '/^```!$/{f=1; next} /^```/{f=0} f' "$sk"; grep -o '!`[^`]*`' "$sk" 2>/dev/null | sed 's/^!`//; s/`$//')"
  [ -n "$(printf '%s' "$cmds" | tr -d '[:space:]')" ] || continue
  for shbin in bash zsh; do
    command -v "$shbin" >/dev/null 2>&1 || continue
    if ! printf '%s\n' "$cmds" | "$shbin" -e -s >/dev/null 2>&1; then
      echo "    preamble: $(basename "$(dirname "$sk")")/SKILL.md fails under $shbin"; pre_ok=0
    fi
  done
done
[ "$pre_ok" = 1 ] && check "skill !-preambles exit 0 in bash and zsh (empty repo)" 0 0 || check "skill !-preambles exit 0 in bash and zsh (empty repo)" 0 1

echo "rubric library lint"

RUBRICS="$HERE/skills/goal/rubrics"
tcount="$(ls "$RUBRICS"/*.md 2>/dev/null | grep -vc INDEX)"
[ "$tcount" -ge 14 ] && check "library has >=14 templates ($tcount)" 0 0 || check "library has >=14 templates ($tcount)" 0 1

idx_entries="$(grep -c '](.*\.md)' "$RUBRICS/INDEX.md" 2>/dev/null)"
[ "$idx_entries" -ge 14 ] && check "INDEX lists >=14 templates ($idx_entries)" 0 0 || check "INDEX lists >=14 templates ($idx_entries)" 0 1

lint_ok=1
for f in "$RUBRICS"/*.md; do
  case "$f" in *INDEX.md) continue ;; esac
  # the VERIFIER item is exempt: its check IS the verifier protocol
  unchecked_wo_check="$(grep '^- \[ \]' "$f" | grep -v 'VERIFIER' | grep -vc '— check:')"
  if [ "$unchecked_wo_check" != "0" ]; then echo "    lint: $(basename "$f") has $unchecked_wo_check rubric line(s) without '— check:'"; lint_ok=0; fi
  grep -q '^## Stop conditions' "$f" || { echo "    lint: $(basename "$f") missing Stop conditions"; lint_ok=0; }
  src="$(awk '/^## Sources/{f=1; next} f' "$f" | grep -c '^- http')"
  [ "$src" -ge 2 ] || { echo "    lint: $(basename "$f") has <2 sources"; lint_ok=0; }
done
[ "$lint_ok" = 1 ] && check "every rubric line carries a check; stop conditions + >=2 sources per template" 0 0 || check "every rubric line carries a check; stop conditions + >=2 sources per template" 0 1

echo
echo "passed: $PASS  failed: $FAIL"
[ "$FAIL" = 0 ] || exit 1
