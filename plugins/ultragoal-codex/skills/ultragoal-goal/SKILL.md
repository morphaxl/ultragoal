---
name: ultragoal-goal
description: "Ultragoal for Codex. Use when the user asks for ultragoal in Codex, a hook-backed or runner-backed Codex goal loop, a rubric-backed Codex /goal, durable goal execution, evidence-led completion, panel verification, or to turn a brain dump into a Codex-native goal. Do not use for trivial one-turn tasks unless explicitly invoked."
---

# Ultragoal Goal for Codex

Use this skill to convert an open-ended request into a file-backed Ultragoal spec, audit the rubric, then attach Codex native Goal mode to that spec. The Codex plugin bundles a Codex Stop hook gate plus a SessionStart context hook. When the installed Codex build honors Stop-hook blocking, the gate keeps Codex working until the rubric and verifier/panel verdict hold. When a Codex build treats hooks as advisory or hooks are not yet trusted, `npx ultragoal run --codex --headless "<brief>"` is the supported runner fallback: it starts Codex with the same file-backed contract, bypasses hook trust for that vetted automation run, inspects the active goal after each turn, and resumes with the remaining rubric/verifier work until the file is marked done or the runner cap is reached.

## Inputs

- User brief or brain dump.
- Repository guidance (`AGENTS.md`) and any existing `.ultragoal/memory/` files.
- Current Codex goal state, if `get_goal` is available.
- Codex hook state if the user reports hook warnings; ask them to open `/hooks` only when trust is blocking the bundled gate.

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
   - Read project instructions and inspect the code enough to avoid asking discoverable questions.
   - Ask at most 1-3 narrow questions only when the answer changes the rubric or safety boundary. Use a recommended default when the repo and brief support one.

3. **Write the draft**
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

4. **Audit the draft**

Run:

```bash
node <skill-dir>/scripts/rubric-audit.mjs .ultragoal/codex-goals/<slug>/goal.md
```

Resolve `<skill-dir>` to this skill directory. A `BLOCKER` is a draft defect; revise and rerun before arming. A `WARN` must be fixed or recorded as an intentional tradeoff in Context.

5. **Recap before arming**
   - Summarize the objective, key decisions, non-goals, proof strategy, and remaining warnings.
   - Only arm when the user explicitly says to start/arm/run the goal, or when their original prompt explicitly requested creating/running a goal.

6. **Arm Codex native Goal mode**
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

7. **Execute**
   - Keep `update_plan` synchronized with the next few rubric items.
   - Use browser, simulator, Computer Use, curl, tmux, or CLI evidence according to the QA map. Tests are supporting evidence, not proof of a UI or external-service claim.
   - After each passed item, update the checkbox and add one evidence line under it or in `# Verification log`.
   - If `verify: panel`, dispatch or run three independent verifier passes at the end. Each must append exactly `ULTRAGOAL-VERIFIED: PASS rubric=<hash> lens=<checks|refute|constraints>` to the goal file, bound to the current rubric hash.
   - If Codex prints a hook-trust warning, tell the user to run `/hooks` and trust the Ultragoal bundled hooks, or rerun through `npx ultragoal run --codex --headless "<brief>"`.
   - Do not call `update_goal(status="complete")` until every rubric item, constraints check, and final verifier item is complete.
   - Use `update_goal(status="blocked")` only when the same blocking condition has repeated for the required Codex goal turns and no meaningful progress is possible.

8. **Resume**
   - On continuation or after compaction, read the goal file and `get_goal` before doing anything else.
   - Continue from unchecked rubric items; do not re-plan from scratch unless the file is incoherent or the user changes scope.

## Codex-Specific Notes

- Codex native Goal mode remains the visible task tracker; the Ultragoal file is the stronger contract, and the Codex Stop hook or runner enforces that contract.
- Installed plugin hooks require Codex hook trust. Interactive users review them with `/hooks`; headless `npx ultragoal run --codex --headless` passes `--dangerously-bypass-hook-trust` because the command is explicitly launching this vetted plugin.
- Codex Stop hook behavior can vary by CLI version. If a hook does not block the turn, treat the hook as an advisory reminder and rely on the headless runner plus the verifier/panel rubric before completion.
- Prefer Codex Browser Use for local web UI QA and Computer Use for simulator/desktop GUI flows when command-line proof is not faithful.
- Keep the goal objective short and put long details in the draft file, because native goal text has a small limit.
