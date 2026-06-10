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

If a goal is already active in `.ultragoal/goals/active.md`, never silently overwrite — ask the user to pick one: (a) keep working on the current goal and drop this brief, (b) **queue** the new goal (write the finished spec to `.ultragoal/goals/queue/<slug>.md`; it gets armed when the active goal archives), or (c) pause or abandon the current goal (per the `ultragoal:stop` protocol) and arm this one. When a goal archives and the queue is non-empty, mention the next queued goal to the user.

## Phase 2 — Interview, gated by confidence

Identify what the spec needs that you cannot infer with high confidence from the brief, the repo, and memory. Typical gaps: the measurable end state, scope boundaries (what is explicitly out), who/what the result is for, constraints that must not break, and the rough effort budget.

Check `interview-depth` in `.ultragoal/config.md` (the user can also override per-goal by saying "quick" or "deep/thorough interview" in the brief):

- **quick** (default): ask only the genuine gaps — batched in one AskUserQuestion call where possible, at most ~5 questions, each with concrete options and your recommended default first.
- **deep**: run multiple rounds, one AskUserQuestion batch per theme — intent and audience → shape of done → scope edges (what's explicitly out) → risks and constraints → how to verify. Skip any round the brief already answers; stop when a round adds nothing new.

Either way: do not ask things the codebase can answer; go look instead.

If running non-interactively (no user available), skip questions: make the most reasonable assumption for each gap and record every assumption explicitly in the spec's Context section.

## Phase 3 — Draft the spec

First decide the goal's **kind**:

- **`task`** (default): success is "this exists and works" — features, fixes, migrations, investigations.
- **`experiment`**: success is "this number improved" — latency, build time, size, cost, score — and one command can measure it. Read [experiment-guide.md](experiment-guide.md) and compile the spec as a measure-and-ratchet loop instead of a checklist. If the user's brief is an optimize-ask but no reliable measure command exists, the spec's first rubric item is building one.

Copy the structure from [goal-template.md](goal-template.md) and write the rubric following [rubric-guide.md](rubric-guide.md) — read it; rubric quality decides whether this loop converges. A well-designed rubric is doing more work than the model.

Before showing the user, adversarially review your own rubric against the anti-pattern list in the guide (vague judgments, unmeasurable criteria, missing stop conditions, no incremental order, checks the repo can't actually run). Fix what you find.

## Phase 4 — Confirm and arm

Show the user two things together, then ask for a yes / edits:

1. **The plan, briefly** — 3–6 bullets of how you intend to attack this: the order of work, what gets delegated to subagents, where the risk is, and when the verifier runs. Plain language; this is the user's last cheap chance to redirect you.
2. **The draft spec** — objective, rubric, stop conditions, constraints, budget.

On yes:

1. Write it to `.ultragoal/goals/active.md` with `status: active`, `session: ${CLAUDE_SESSION_ID}` (the gate binds to this session, so other sessions in the repo stay free for side questions), and `verify:` copied from the `verification` knob in `.ultragoal/config.md` (default on; off means the gate accepts a fully checked rubric without the verifier pass).
2. Reset the loop state: write `0` to `.ultragoal/goals/.turns` and delete `.ultragoal/goals/.rubric-hash` and `.ultragoal/goals/results.tsv` if they exist (they belong to the previous goal).
3. Tell the user the loop is armed: the Stop gate will keep the session working until the rubric is independently verified and lessons are distilled — and how to bail out (`/ultragoal:stop`, or the turn budget).

Then **begin working immediately**. Do not end the turn with a plan.

## While the loop runs

- When you have enough information to act, act. Do not re-derive facts already established, re-litigate decided questions, or narrate options you will not pursue.
- Before reporting progress, audit each claim against a tool result from this session. Only report work you can point to evidence for; if something is not yet verified, say so explicitly. If tests fail, say so with the output.
- Never check a rubric box on your own say-so. Dispatch the `ultragoal:verifier` subagent at the cadence set in `.ultragoal/config.md` (default: before claiming any rubric item); it re-runs the checks and appends the verdict to the Verification log. Check boxes only for items the verifier passed.
- Log structural decisions and abandoned approaches in the Decision journal as you go — one line each. This feeds distillation.
- Delegate independent subtasks to subagents and keep working while they run. Intervene if a subagent goes off track.
- Don't add features, refactor, or introduce abstractions beyond what the rubric requires. The simplest thing that passes an honest check wins.
- Pause for the user only when the work genuinely requires them: a destructive or irreversible action, a real scope change, or input that only they can provide. If you hit one of these, ask and end the turn, rather than ending on a promise.
- If you hit a stop condition or are blocked on input only the user can provide, set `status: paused` in the goal file, report honestly where every rubric item stands, and stop.
