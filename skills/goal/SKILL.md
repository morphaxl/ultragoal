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

Goals are per-session: each lives in `.ultragoal/goals/active/<slug>/goal.md` with a `session:` field, and the gate enforces only the goal armed by the current session. So a goal active in *another* session does **not** block you — arm a new one freely; concurrent goals across sessions are the intended model. Only if **this same session** already has an active goal do you ask the user to pick: keep the current one (drop this brief), or replace it (pause/abandon per the `ultragoal:stop` protocol, then arm this).

One caution: sessions share the working tree. If another session's active goal touches files this goal will also touch — and any `kind: experiment` goal touches everything, since it commits and resets constantly — warn the user before arming and suggest running one of the goals in its own checkout instead (`claude --worktree`, or `npx ultragoal run --worktree`). The gate keeps the *loops* from interfering; only a worktree keeps the *files* from interfering.

## Phase 2 — Interview for the decisions that steer the outcome

Ask **high-leverage questions only** — the forks where different answers produce materially different work. A question earns its place when all three hold: (1) the answer changes what you build, not just cosmetics; (2) you genuinely can't pick it confidently from the brief, repo, and memory; (3) guessing wrong is expensive (rework, wasted budget, wrong direction). If a question fails any of these, don't ask it — answer it yourself from the codebase, or take the obvious default and note it.

The leverage usually lives in these forks (pick the 2–5 that actually matter for *this* brief):

- **Approach** — when there are real alternatives ("rewrite vs patch", "client-side vs server-side", "library X vs Y"), and they lead down different roads. Name the options with their tradeoffs.
- **Definition of done** — the success bar you can't infer: how good is good enough, what number, what cases must work. This becomes the rubric, so it's the highest-leverage answer in the whole interview.
- **Scope edges** — what's explicitly *out*. The cheapest way to prevent gold-plating and wasted turns is to ask what NOT to touch.
- **Priority tradeoff** — when you can't max everything: speed vs robustness vs polish, coverage vs time, ship-now vs do-it-right. Ask which way to lean.
- **Risk tolerance** — for anything destructive or hard to reverse: how much autonomy, what must you confirm first.

Make every question concrete and decision-shaped: real options (not "what do you think?"), your **recommended default first** with a one-line why, so the user can ratify fast or override deliberately. Give the reason behind the choice, not just the choice. Prefer one batched `AskUserQuestion` call.

Check `interview-depth` in `.ultragoal/config.md` (the user can override per-goal by saying "quick" or "deep/thorough interview"):

- **quick** (default): one batch, the 2–5 highest-leverage forks.
- **deep**: multiple rounds, one batch per theme — approach → definition of done → scope edges → priority/risk tradeoffs → how to verify. Skip any round the brief already settles; stop when a round stops changing the plan.

Never ask what the codebase can answer — go look. If running non-interactively (no user), don't ask: make the most defensible call on each fork and record every such decision explicitly in the spec's Context as an assumption.

## Phase 3 — Draft the spec

First decide the goal's **kind**:

- **`task`** (default): success is "this exists and works" — features, fixes, migrations, investigations.
- **`experiment`**: success is "this number improved" — latency, build time, size, cost, score — and one command can measure it. Read [experiment-guide.md](experiment-guide.md) and compile the spec as a measure-and-ratchet loop instead of a checklist. If the user's brief is an optimize-ask but no reliable measure command exists, the spec's first rubric item is building one.

**Check the rubric library first**: read [rubrics/INDEX.md](rubrics/INDEX.md) and if the brief matches a domain, load that template as your starting point — it carries research-backed thresholds and check commands. Adapt it to this repo (real commands, applicable items only); don't transplant blindly. Also scan the available skills in this session against the template's "Skills to pair" line and the task domain — if a matching skill exists (e.g. `frontend-design` for UI work, `vercel-react-best-practices` for React), plan to use it during execution and note it in the spec's Context.

Copy the structure from [goal-template.md](goal-template.md) and write the rubric following [rubric-guide.md](rubric-guide.md) — read it; rubric quality decides whether this loop converges. A well-designed rubric is doing more work than the model.

Before showing the user, adversarially review your own rubric against the anti-pattern list in the guide (vague judgments, unmeasurable criteria, missing stop conditions, no incremental order, checks the repo can't actually run). Fix what you find.

## Phase 4 — Recap, confirm, and arm

Before any building, give the user a tight, skimmable recap so they can course-correct while it's still cheap. Four short parts, in plain language:

1. **What I understood you want** — one or two sentences restating the goal in your words (proof you got it right).
2. **Key decisions** — the forks from the interview and which way each went, including the calls you made yourself (so a wrong assumption surfaces now, not after 15 turns).
3. **What I'm going to do** — 3–6 bullets: the order of work, what gets delegated to subagents, where the risk is, when the verifier runs.
4. **How we'll know it's done** — the rubric in brief (the checkable end state and the stop conditions/budget).

Then ask for a yes / edits. Keep it scannable — this is a confirmation, not the full spec dump; the spec file holds the detail.

On yes:

1. Create `.ultragoal/goals/active/<slug>/` and write the spec to `goal.md` inside it (if that directory already exists for a different session, add a short suffix to the slug). Frontmatter: `status: active`, `session: ${CLAUDE_SESSION_ID}` (the gate enforces only this session's goal), and `verify:` copied from the `verification` knob in `.ultragoal/config.md` (default on; off means the gate accepts a fully checked rubric without the verifier pass).
2. Write `0` to `.ultragoal/goals/active/<slug>/.turns`. (Experiment goals keep their `results.tsv` in this same directory, beside `goal.md`.)
3. Tell the user the loop is armed: the Stop gate will keep the session working until the rubric is independently verified and lessons are distilled — and how to bail out (`/ultragoal:stop`, or the turn budget).

Then **begin working immediately**. Do not end the turn with a plan.

## While the loop runs

- When you have enough information to act, act. Do not re-derive facts already established, re-litigate decided questions, or narrate options you will not pursue.
- Before reporting progress, audit each claim against a tool result from this session. Only report work you can point to evidence for; if something is not yet verified, say so explicitly. If tests fail, say so with the output.
- Never check a rubric box on your own say-so, and never write a `ULTRAGOAL-VERIFIED` line yourself — that verdict is the verifier's alone. Dispatch the `ultragoal:verifier` subagent at the cadence set in `.ultragoal/config.md` (default: before claiming any rubric item), **passing it the exact path to this goal's `goal.md`** so it hashes and signs the right file. It re-runs the checks and appends the verdict. Check boxes only for items the verifier passed.
- Log structural decisions and abandoned approaches in the Decision journal as you go — one line each. This feeds distillation.
- Delegate independent subtasks to subagents and keep working while they run. Intervene if a subagent goes off track.
- Don't add features, refactor, or introduce abstractions beyond what the rubric requires. The simplest thing that passes an honest check wins.
- Pause for the user only when the work genuinely requires them: a destructive or irreversible action, a real scope change, or input that only they can provide. If you hit one of these, ask and end the turn, rather than ending on a promise.
- If you hit a stop condition or are blocked on input only the user can provide, set `status: paused` in the goal file, report honestly where every rubric item stands, and stop.
