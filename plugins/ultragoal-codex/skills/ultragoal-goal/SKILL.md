---
name: ultragoal-goal
description: "Codex-native Ultragoal bridge. Use when the user asks for ultragoal in Codex, a rubric-backed Codex /goal, durable goal execution, evidence-led completion, or to turn a brain dump into Codex native Goal mode. Do not use for trivial one-turn tasks unless explicitly invoked."
---

# Ultragoal Goal for Codex

Use this skill to convert an open-ended request into a file-backed Ultragoal spec, audit the rubric, then attach Codex native Goal mode to that spec. This is a Codex bridge, not the Claude hook-gated loop: Codex Goal mode owns persistence, while the spec owns the definition of done.

## Inputs

- User brief or brain dump.
- Repository guidance (`AGENTS.md`) and any existing `.ultragoal/memory/` files.
- Current Codex goal state, if `get_goal` is available.

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
   - Create `.ultragoal/codex-goals/<slug>/goal.md`.
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
verify: on
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
   - Do not call `update_goal(status="complete")` until every rubric item, constraints check, and final verifier item is complete.
   - Use `update_goal(status="blocked")` only when the same blocking condition has repeated for the required Codex goal turns and no meaningful progress is possible.

8. **Resume**
   - On continuation or after compaction, read the goal file and `get_goal` before doing anything else.
   - Continue from unchecked rubric items; do not re-plan from scratch unless the file is incoherent or the user changes scope.

## Codex-Specific Notes

- Codex native Goal mode is the persistence layer; this skill supplies a stronger goal contract.
- Do not install or require Claude-only hooks for this bridge.
- Prefer Codex Browser Use for local web UI QA and Computer Use for simulator/desktop GUI flows when command-line proof is not faithful.
- Keep the goal objective short and put long details in the draft file, because native goal text has a small limit.
