#!/usr/bin/env bash
# Live smoke for Codex Stop-hook blocking via the INSTALLED ultragoal-codex plugin.
#
# The old version of this smoke wrote a project-level .codex/hooks.json — a surface
# current Codex builds ignore — so it reported "hooks don't block" while the plugin
# hook demonstrably does (verified live on codex-cli 0.142.5, 2026-07-07). This
# version exercises the real surface: the plugin's own Stop hook from the Codex
# plugin cache, against a scratch repo with an active budget:1 goal.
#
# Informational by design — always exits 0 (CI has no Codex). Outputs are honest:
#   CODEX_STOP_HOOK_BLOCKS=1        plugin gate blocked and Codex kept working
#   CODEX_STOP_HOOK_BLOCKS=0        gate fired once but Codex stopped (advisory build;
#                                   the headless runner is the enforcement fallback)
#   CODEX_STOP_HOOK_SMOKE=SKIPPED   surface unavailable — NO claim about blocking made
set -u

CODEX_BIN="$(command -v codex 2>/dev/null || true)"
[ -x "${HOME}/.bun/bin/codex" ] && CODEX_BIN="${HOME}/.bun/bin/codex"
if [ -z "$CODEX_BIN" ]; then
  echo "CODEX_STOP_HOOK_SMOKE=SKIPPED reason=codex-missing"
  exit 0
fi

CODEX_HOME_DIR="${CODEX_HOME:-$HOME/.codex}"
GATE_IN_CACHE="$(ls "$CODEX_HOME_DIR"/plugins/cache/*/ultragoal-codex/*/scripts/codex-goal-gate.sh 2>/dev/null | head -1)"
if [ -z "$GATE_IN_CACHE" ]; then
  echo "CODEX_STOP_HOOK_SMOKE=SKIPPED reason=plugin-not-installed (install: codex plugin add ultragoal-codex@shamilkayal)"
  exit 0
fi

# Scratch repo with an active budget:1 goal. If Codex honors Stop-hook blocking,
# the gate fires more than once (.turns >= 2): first block feeds the rubric back,
# the budget then forces a warn -> pause, all bounded to a handful of turns.
# If hooks are advisory, Codex stops after the first block and .turns stays 1.
# The scratch dir lives INSIDE the current (trusted) checkout and is NOT its own
# git root: Codex resolves trust by project root, so a system-temp dir or a nested
# git repo reads as untrusted and blocking is downgraded to advisory there. The
# goal gate walks up from PWD and stops at the first .ultragoal, keeping this
# scratch goal isolated from the checkout's own state.
T="$(mktemp -d "$(pwd)/.codex-hook-smoke.XXXXXX")"
trap 'rm -rf "$T"' EXIT
GDIR="$T/.ultragoal/goals/active/smoke"
mkdir -p "$GDIR"
cat > "$GDIR/goal.md" <<'EOF'
---
slug: smoke
status: active
budget: 1
verify: on
---
# Rubric
- [ ] intentionally unreachable smoke item — check: `git log --oneline -1 refs/ultragoal-smoke-never-exists` exits 0
- [ ] VERIFIER: independent sign-off recorded below
# Stop conditions
- 1 turn reached (this smoke expects to hit the budget immediately)
EOF

LOG="$(mktemp)"
(cd "$T" && "$CODEX_BIN" --sandbox workspace-write --ask-for-approval never --dangerously-bypass-hook-trust exec "Reply with exactly READY." >"$LOG" 2>&1)
status=$?
turns=0
[ -r "$GDIR/.turns" ] && turns="$(tr -dc '0-9' < "$GDIR/.turns" 2>/dev/null)"

if [ "${turns:-0}" -ge 2 ]; then
  echo "CODEX_STOP_HOOK_BLOCKS=1 gate_firings=$turns status=$status"
elif [ "${turns:-0}" -eq 1 ]; then
  echo "CODEX_STOP_HOOK_BLOCKS=0 gate_firings=1 status=$status (gate fired once; Codex stopped anyway — advisory build; headless runner is the enforcement fallback)"
else
  echo "CODEX_STOP_HOOK_SMOKE=SKIPPED reason=gate-never-fired status=$status (plugin hook did not run — check plugin trust via /hooks)"
  tail -5 "$LOG" 2>/dev/null | sed 's/^/codex-smoke: /'
fi
rm -f "$LOG"
exit 0
