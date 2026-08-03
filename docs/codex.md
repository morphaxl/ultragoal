# ultragoal for Codex

The Codex plugin gives Codex the same core contract as the Claude side: `$ultragoal-goal` drafts a file-backed rubric, runs the pre-arm rubric audit, then attaches Codex's native `/goal` / Goal mode to that contract. The plugin bundles Codex lifecycle hooks: a **Stop-hook gate** that enforces active goal files (turn budget, evidence ledger, hash-bound verdicts, panel lenses), **SessionStart** hooks that reload active-goal context and link the bundled roles, and a **SubagentStop** evidence gate for `ultragoal-executor`.

**Hook status — verified, not hoped:** Stop-hook blocking works on codex-cli 0.142.x **in trusted project roots** — the gate blocks the stop, Codex keeps working, and the bundled verifier role dispatches (verified live 2026-07-07; `tests/codex-hook-smoke.sh` re-runs this check on any machine with the plugin installed). In **untrusted directories** Codex downgrades blocking to advisory; older builds may too. The headless runner below is the enforcement fallback for those cases.

**Known limitation vs the Claude gate:** Codex goals are not scoped per session — any active goal in the repo gates every Codex session there. Run one active Codex goal per repo; parallel goals need separate git worktrees.

## Install

```bash
npx ultragoal --codex     # Codex only
npx ultragoal --all       # Claude Code + Codex in one pass
```

Manual route:

```bash
codex plugin marketplace add shamilkayal/ultragoal
codex plugin add ultragoal-codex@shamilkayal
```

Then start a new Codex session and invoke:

```text
$ultragoal-goal turn this brain dump into a rubric-backed Codex goal: ...
```

Interactive Codex may ask you to review and trust the bundled hooks with `/hooks`; that trust prompt is expected — and blocking only engages once the directory is trusted.

## Interactive runs

```bash
npx ultragoal run --codex "make chat load faster without breaking tests"
```

Launches Codex in interview mode with approval guardrails on (so you can review `/hooks`): it consults memory and repo context, asks only the high-leverage questions whose answers change the contract, drafts the rubric, gives you a recap, then waits for a standalone **Arm goal** confirmation before implementation begins. `--safe` switches approvals from `never` to `on-request`.

## Headless runs

```bash
npx ultragoal run --codex --headless "make chat load faster without breaking tests"
```

Headless Codex does not ask interview or arm questions. It records defaults for ambiguous choices in the goal file, then uses `codex exec` with a workspace-write sandbox, approval policy `never`, and `--dangerously-bypass-hook-trust` for this vetted plugin run. After each Codex turn, the runner inspects the active goal file; if unchecked rubric items, missing evidence, or missing verifier/panel verdicts remain, it continues with `codex exec resume --last` and the exact remaining work — so even a build that treats Stop hooks as advisory is held to the same file-backed contract. The runner computes the rubric hash with the same byte-stream as the gate, and refuses to report success unless the goal file itself proves done.

`--worktree` is intentionally not implemented for Codex yet — create a git worktree yourself, `cd` into it, and run the command there.

## Roles

For larger Codex goals, the root thread stays orchestrator and Codex gets two custom roles: `ultragoal-executor` for scoped implementation work and `ultragoal-verifier` for fresh-context review. The verifier computes the rubric hash itself from the goal file (the recipe is in its role definition) — it never accepts a hash quoted to it. Executors must finish with a receipt under `.ultragoal/evidence/`; the bundled SubagentStop hook rejects missing, empty, symlinked, or out-of-tree receipts before the root session accepts the subtask.

## Update / uninstall

```bash
npx ultragoal update --codex     # or --all
npx ultragoal uninstall --codex  # removes plugin, marketplace entry, and the copied agent TOMLs
```
