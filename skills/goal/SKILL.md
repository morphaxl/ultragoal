---
name: goal
description: Turn a messy brain dump (raw voice transcript welcome) into a verifiable goal with a checkable rubric, then work autonomously until it is verified and lessons are saved. Use for substantial end-to-end work — build, fix, migrate, investigate.
argument-hint: [describe what you want — an unedited voice ramble is fine]
---

Turn the user's brief into an armed, self-correcting goal loop, then start working toward it.

The input may be an unedited speech transcript: expect filler words, self-corrections, topic jumps, and missing structure. Extract intent; never quote the mess back at the user.

User's brief:

<brief>
$ARGUMENTS
</brief>

## Phase 0 — Initialize if needed

If `.ultragoal/` does not exist in the project root, run the `ultragoal:setup` skill first (it scaffolds directories, asks the preference knobs, and offers the CLAUDE.md block), then continue here.

## Phase 1 — Consult before asking

Before asking the user anything:

- Read `.ultragoal/memory/MEMORY.md` and any topic files relevant to the brief. Trust `[VERIFIED]` facts; treat `[UNVERIFIED]` ones as hypotheses.
- Scan the repo with parallel Explore subagents for whatever the brief touches — existing implementations, tests, conventions, prior art.
- Check `.ultragoal/goals/archive/` for related past goals (especially their Decision journals and failure notes).

If a goal is already active in `.ultragoal/goals/active.md`, stop and ask the user whether to replace it (archive as abandoned) or keep it — never silently overwrite.

## Phase 2 — Interview, gated by confidence

Identify what the spec needs that you cannot infer with high confidence from the brief, the repo, and memory. Typical gaps: the measurable end state, scope boundaries (what is explicitly out), who/what the result is for, constraints that must not break, and the rough effort budget.

Ask only those — batched in one AskUserQuestion call where possible, at most ~5 questions, each with concrete options and your recommended default first. Do not ask things the codebase can answer; go look instead.

If running non-interactively (no user available), skip questions: make the most reasonable assumption for each gap and record every assumption explicitly in the spec's Context section.

## Phase 3 — Draft the spec

Copy the structure from [goal-template.md](goal-template.md) and write the rubric following [rubric-guide.md](rubric-guide.md) — read it; rubric quality decides whether this loop converges. A well-designed rubric is doing more work than the model.

Before showing the user, adversarially review your own rubric against the anti-pattern list in the guide (vague judgments, unmeasurable criteria, missing stop conditions, no incremental order, checks the repo can't actually run). Fix what you find.

## Phase 4 — Confirm and arm

Show the user the draft spec (objective, rubric, stop conditions, constraints, budget) and ask for a yes / edits. On yes:

1. Write it to `.ultragoal/goals/active.md` with `status: active`.
2. Reset the turn counter: write `0` to `.ultragoal/goals/.turns`.
3. Tell the user the loop is armed: the Stop gate will keep the session working until the rubric is independently verified and lessons are distilled — and how to bail out (`/ultragoal:stop`, or the turn budget).

Then **begin working immediately**. Do not end the turn with a plan.

## While the loop runs

- When you have enough information to act, act. Do not re-derive facts already established, re-litigate decided questions, or narrate options you will not pursue.
- Before reporting progress, audit each claim against a tool result from this session. Only report work you can point to evidence for; if something is not yet verified, say so explicitly. If tests fail, say so with the output.
- Never check a rubric box on your own say-so. Dispatch the `ultragoal:verifier` subagent at the cadence set in `.ultragoal/config.md` (default: before claiming any rubric item); it re-runs the checks and appends the verdict to the Verification log. Check boxes only for items the verifier passed.
- Log structural decisions and abandoned approaches in the Decision journal as you go — one line each. This feeds distillation.
- Delegate independent subtasks to subagents and keep working while they run. Intervene if a subagent goes off track.
- Don't add features, refactor, or introduce abstractions beyond what the rubric requires. The simplest thing that passes an honest check wins.
- If you hit a stop condition or are blocked on input only the user can provide, set `status: paused` in the goal file, report honestly where every rubric item stands, and stop.
