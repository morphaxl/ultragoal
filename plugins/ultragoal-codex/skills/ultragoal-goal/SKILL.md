---
name: ultragoal-goal
description: "Ultragoal for Codex. Use when the user asks for ultragoal in Codex, a hook-backed or runner-backed Codex goal loop, a rubric-backed Codex /goal, durable goal execution, evidence-led completion, panel verification, or to turn a brain dump into a Codex-native goal. Do not use for trivial one-turn tasks unless explicitly invoked."
---

# Ultragoal Goal for Codex

Use this skill to convert an open-ended request into a file-backed Ultragoal spec, audit the rubric, then attach Codex native Goal mode to that spec. The Codex plugin bundles a Codex Stop hook gate, SessionStart context/bootstrap hooks, and a SubagentStop evidence gate for the `ultragoal-executor` role. Stop-hook blocking is verified working on codex-cli 0.142.x **in trusted project roots** — the gate keeps Codex working until the rubric and verifier/panel verdict hold. In untrusted directories Codex downgrades blocking to advisory, and older builds may too; there, `npx ultragoal run --codex --headless "<brief>"` is the supported enforcement fallback: it starts Codex with the same file-backed contract, bypasses hook trust for that vetted automation run, inspects the active goal after each turn, and resumes with the remaining rubric/verifier work until the file is marked done or the runner cap is reached.

Known limitation (unlike the Claude gate): Codex goals are not scoped per session — the gate enforces any active goal in the repo whose `session`/`codex_thread` field is empty, for every Codex session there. Run one active Codex goal per repo at a time; a second concurrent goal needs its own git worktree.

## Inputs

- User brief or brain dump.
- Repository guidance (`AGENTS.md`) and any existing `.ultragoal/memory/` files.
- Current Codex goal state, if `get_goal` is available.
- Codex hook state if the user reports hook warnings; ask them to open `/hooks` only when trust is blocking the bundled gate.
- Mode hint from `npx ultragoal run --codex`: `MODE: interactive-interview` or `MODE: headless-autonomous`.

## First Reads

After deciding this skill applies, read:

1. `references/rubric-guide.md`
2. `references/qa-capability-map.md`

If present in the repo, also read `.ultragoal/memory/MEMORY.md` and any active `.ultragoal/goals/**/goal.md` before drafting.

## Workflow

1. **Triage**
   - If the task is trivial and the user did not explicitly ask for a goal, do it directly instead of creating ceremony.
   - If another Codex goal is active and its objective differs, stop and ask whether to pause/clear it or only draft a spec. Do not call `create_goal` over an unrelated active goal.

2. **Ground before asking**
   - Always consult memory and repo context before asking: read project instructions, `.ultragoal/config.md` if present, `.ultragoal/memory/MEMORY.md` if present, and enough relevant source/docs to avoid asking discoverable questions.
   - Ask only questions whose answer changes what gets built, the rubric, the verification rung, or a safety/scope boundary. Use a recommended default when the repo and brief support one.
   - Size the interview by ambiguity, stakes, and run length: clear reversible goals can get one short batch or no questions; vague, long, risky, release-grade, or user-specified "deep/max" goals need a deeper interview before the draft is armed.

3. **Mode-specific interview**
   - **Interactive interview mode** (`MODE: interactive-interview`, default for `npx ultragoal run --codex "<brief>"`): act like Claude `/ultragoal:goal`. Ask decision-shaped questions with the recommended default first; include a one-line reason/tradeoff for each option. Prefer one concise batch, but use additional rounds for deep/high-stakes goals. After drafting, provide a recap before arming: objective, key decisions, assumptions/defaults you made, non-goals, verification plan, and budget/rigor choice. Then ask one standalone **Arm goal** question and wait for explicit user confirmation before setting `status: active`, `codex_goal: active`, or calling `create_goal`.
   - **Headless autonomous mode** (`MODE: headless-autonomous`, used by `npx ultragoal run --codex --headless "<brief>"`): do not ask the user questions. Make conservative assumptions from the brief, repo, and memory; record explicit defaults in the goal file Context/Verification log so the user can audit what was assumed; then arm and execute. Headless must never wait for an arm prompt.

4. **Write the draft**
   - Prefer `.ultragoal/goals/active/<slug>/goal.md` for new hook-backed goals so Claude and Codex use the same canonical active-goal shape.
   - If the repo already uses `.ultragoal/codex-goals/<slug>/goal.md`, continuing that legacy path is acceptable; the Codex gate enforces both locations.
   - Use `status: draft` until the user explicitly asks to start/arm/run it.
   - Keep the draft readable by other harnesses.

Required shape:

```markdown
---
slug: <slug>
type: codex-goal
status: draft
created: <YYYY-MM-DD>
codex_goal: pending
verify: on|panel
budget: <turn budget>
---

# Objective
<outcome plus why>

# Context
<decisions, assumptions, relevant paths, risks>

# Rubric
- [ ] <atomic claim> - check: `<exact command>` <binary expected result>
- [ ] <UI/runtime claim> - check: BROWSER or SIMULATOR or MANUAL DEVICE STEP - <exact route/device/action/evidence artifact>
- [ ] VERIFIER: independent sign-off recorded in the Verification log

# Stop conditions
- <budget, repeated-failure, safety, or user-pause rule>

# Constraints
- <must not change> - check: `<exact command>` <expected result>

# Verification log
```

5. **Audit the draft**

Run:

```bash
node <skill-dir>/scripts/rubric-audit.mjs .ultragoal/codex-goals/<slug>/goal.md
```

Resolve `<skill-dir>` to this skill directory. A `BLOCKER` is a draft defect; revise and rerun before arming. A `WARN` must be fixed or recorded as an intentional tradeoff in Context.

6. **Recap before arming**
   - Summarize the objective, key decisions, non-goals, proof strategy, and remaining warnings.
   - In interactive interview mode, ask a standalone **Arm goal** question and wait for explicit user confirmation before arming.
   - In headless autonomous mode, record the defaults/assumptions that replaced user answers and arm without asking.

7. **Arm Codex native Goal mode**
   - If `create_goal` is available, call it with a compact objective under 4,000 characters. Do not set a token budget unless the user explicitly requested one.
   - After arming, update the draft frontmatter to `status: active` and `codex_goal: active`.
   - If the user requested "max rigor" or "panel verification", set `verify: panel`; completion then requires all three fresh-context lenses: `checks`, `refute`, and `constraints`.
   - Objective template:

```text
Work from .ultragoal/codex-goals/<slug>/goal.md. Complete every unchecked rubric item with recorded evidence, use the named real-surface QA channels, keep the file updated, and do not mark the goal complete until the final verifier item passes.
```

   - If goal tools are unavailable, tell the user to run:

```text
/goal Work from .ultragoal/codex-goals/<slug>/goal.md until every rubric item has evidence and the verifier item passes.
```

8. **Execute**
   - Keep `update_plan` synchronized with the next few rubric items.
   - In substantial goals, keep the root Codex thread as the orchestrator: planning, updating the goal file, integrating results, and deciding what proof is still missing. Delegate implementation subtasks to `ultragoal-executor` when Codex subagent tools are available. Give each executor prompt `TASK`, `DELIVERABLE`, `SCOPE`, and `VERIFY` sections.
   - Every `ultragoal-executor` completion must create one non-empty receipt under `.ultragoal/evidence/` and end its final response with `ULTRAGOAL_EVIDENCE_RECORDED: <path>`. The bundled SubagentStop hook blocks missing, empty, symlinked, or out-of-tree receipts for a small retry budget.
   - Use browser, simulator, Computer Use, curl, tmux, or CLI evidence according to the QA map. Tests are supporting evidence, not proof of a UI or external-service claim.
   - After each passed item, update the checkbox and add one evidence line under it or in `# Verification log`.
   - Use `ultragoal-verifier` for independent verification when Codex subagent tools are available. If `verify: panel`, dispatch or run three independent verifier passes at the end. Each must append exactly `ULTRAGOAL-VERIFIED: PASS rubric=<hash> lens=<checks|refute|constraints>` to the goal file, bound to the current rubric hash.
   - If Codex prints a hook-trust warning, tell the user to run `/hooks` and trust the Ultragoal bundled hooks, or rerun through `npx ultragoal run --codex --headless "<brief>"`.
   - Do not call `update_goal(status="complete")` until every rubric item, constraints check, and final verifier item is complete.
   - Use `update_goal(status="blocked")` only when the same blocking condition has repeated for the required Codex goal turns and no meaningful progress is possible.

9. **Resume**
   - On continuation or after compaction, read the goal file and `get_goal` before doing anything else.
   - Continue from unchecked rubric items; do not re-plan from scratch unless the file is incoherent or the user changes scope.

## Codex-Specific Notes

- Codex native Goal mode remains the visible task tracker; the Ultragoal file is the stronger contract, and the Codex Stop hook or runner enforces that contract.
- Installed plugin hooks require Codex hook trust. Interactive users review them with `/hooks`; headless `npx ultragoal run --codex --headless` passes `--dangerously-bypass-hook-trust` because the command is explicitly launching this vetted plugin.
- The SessionStart bootstrap links bundled custom agents into `~/.codex/agents/`. If the first session reports that agents were linked, restart Codex before relying on `ultragoal-executor` or `ultragoal-verifier`.
- Codex Stop hook behavior can vary by CLI version. If a hook does not block the turn, treat the hook as an advisory reminder and rely on the headless runner plus the verifier/panel rubric before completion.
- Prefer Codex Browser Use for local web UI QA and Computer Use for simulator/desktop GUI flows when command-line proof is not faithful.
- Keep the goal objective short and put long details in the draft file, because native goal text has a small limit.
