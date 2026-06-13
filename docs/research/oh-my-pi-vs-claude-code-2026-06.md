# oh-my-pi vs Claude Code — and could ultragoal port to it? (2026-06)

Due-diligence memo. Studies **oh-my-pi** (omp, `github.com/can1357/oh-my-pi`) against Claude Code, answers what omp already has, what it lacks (the user named *goals* and *dynamic workflows*), and whether an ultragoal-style plugin is buildable on omp — or already exists there. Reflects omp ~v15.12.3 (June 2026); omp ships fast (445 releases), so re-check the load-bearing API facts before acting. Every structural omp claim carries a source tag; `[inferred]` marks anything not read directly.

> **Correction note (load-bearing).** A first draft of this memo claimed omp has *no* goal loop. That was wrong — it searched `docs/`, the hook list, and `swarm-extension` but never opened `packages/coding-agent/src/goals/`, where omp's built-in **goal mode** lives. An independent fresh-context verifier caught the error by re-fetching source. The miss is itself the argument for this memo's central recommendation (an *independent* grader): the same agent that did the research also self-assessed it as complete and was confidently wrong; the independent check is what surfaced the truth.

## TL;DR

- **omp is a serious, mature harness** (12.2k★, TS+Rust, embeddable SDK) that matches most of Claude Code's surface — first-class subagents, curated memory, model-role routing, a TypeScript extension/marketplace system, MCP, slash commands, skills, a session/turn/tool **hook** system — and on raw tool depth (DAP debugger, LSP, browser, hashline edits, native search) arguably exceeds it.
- **omp already HAS a goal loop.** `packages/coding-agent/src/goals/` ships a `goal` tool (`create`/`get`/`resume`/`complete`/`drop`) with an objective, an **autonomous continuation steer** that re-injects the objective each turn, a **token budget** with a budget-limited state, and a strong **pre-completion self-verification discipline**. So a naive "build the goal loop omp is missing" is the wrong framing.
- **The real gap is narrower and sharper: omp's completion is SELF-verified by the same agent — there is no independent grader, no command-checkable rubric artifact, no tamper-evidence, and no enforced memory distillation.** That gap is exactly ultragoal's contribution, and it is well-founded ("a verifier subagent beats self-critique").
- **"dynamic workflows" is NOT a gap** — `swarm-extension` (declarative YAML DAG: pipelines, parallel fan-out, sequential chains, run unattended to completion) is omp's analog of Claude Code's Dynamic Workflows, arguably more accessible (YAML vs Claude generating a JS harness). Terminology note: **omp itself never uses the phrase "dynamic workflows"** (verified absent from its README/docs); the brief framed omp's mid-session model-role switching that way, but that's the brief's wording, not omp's, and it's a different/smaller thing than either swarm or Claude Code's feature.
- **An ultragoal-style plugin is feasible on omp, and cleaner than first thought.** omp's `turn_end` hook is observe-only (can't block a stop), but omp's completion is a **tool call** (`goal({op:"complete"})`) and `tool_call` hooks **can return `{block:true}`**. So ultragoal's gate ports naturally onto *intercepting the completion call with an independent verifier* — reusing omp's existing objective-persistence, continuation, and token budget rather than reinventing them. Verdict: **buildable as a follow-up; recommended approach below.**

## What omp is

A terminal-first AI coding agent ("a coding agent with the IDE wired in"), fork of Mario Zechner's Pi, MIT-licensed, by Can Bölük. Four entry points (TUI, one-shot CLI, Node SDK, RPC/ACP); ~55k LOC Rust for the heavy lifting; 40+ providers. [README]

## omp's built-in goal mode (the thing the first draft missed)

Confirmed by reading source [src/goals/{runtime,state}.ts, src/goals/tools/goal-tool.ts, src/prompts/goals/*, src/prompts/tools/goal.md]:

- **`goal` tool surface:** `create` (requires `objective`, optional positive `token_budget`) / `get` / `resume` / `complete` / `drop`. Statuses: `active | paused | budget-limited | complete | dropped`. [goal.md, state.ts]
- **Autonomous continuation:** a hidden continuation steer (role=user, suppressed from the visible transcript) re-injects the objective every turn — *"This is an autonomous continuation. The objective persists across turns; NEVER redefine success around a smaller, easier, or already-completed subset."* Delivered via `sendHiddenMessage({deliverAs:"steer"|"followUp"|"nextTurn"})`. [goal-continuation.md, runtime.ts]
- **Token-budget gating:** `goalTokenDelta = Δinput + ΔcacheWrite + Δoutput` (deliberately **excludes cacheRead** as "reused prefix, not new work"); on exhaustion the goal is marked `budget-limited` and a wrap-up prompt fires. *Notably this mirrors ultragoal's own cost finding (count output-class tokens, not cache reads) — and omp can gate on tokens reliably because it does it **inside the runtime** with clean per-turn usage, exactly where ultragoal's shell Stop-hook could not, which is why ultragoal correctly chose turns.* [runtime.ts]
- **Completion discipline (self-verification):** before `complete`, the agent must restate the objective as concrete deliverables → map each to evidence → inspect actual current state (never memory) → match verification scope to claim scope → treat uncertainty as not-done → "budget exhaustion is not completion." Strong — but it is the **same agent auditing its own work**, a prompt, not an independent grader. [goal-continuation.md, goal-mode-active.md]

## Capability comparison

| Capability | Claude Code | oh-my-pi | Verdict |
|---|---|---|---|
| Sub-agents | Task tool, isolated context | First-class, workspace isolation, **schema-validated JSON results**, `runSubprocess` | omp matches/exceeds [README, swarm-extension] |
| Memory / state | CLAUDE.md, plugin files | "Hindsight"; `retain`/`recall`; SQLite mnemopi/mnemosyne | omp matches [README] |
| Model routing | model setting, Fast mode | roles `default`/`smol`/`slow`/`plan` + fallback chains | omp matches [README] |
| Plugins / extensions | plugins + marketplace | TS-module extensions, same tool/slash/hotkey/TUI API; marketplace + npm | omp matches [README] |
| Hooks | Stop / PreToolUse / SessionStart, can **block** | session/agent/turn/tool events via `HookAPI.on` | breadth matches; power differs — see below [docs/hooks.md, hooks/types.ts] |
| Dynamic Workflows | Claude generates a JS `agent()/parallel()/pipeline()` harness | `swarm-extension`: YAML DAG, unattended-to-completion | **omp has an analog** [swarm-extension] |
| Goal loop (objective persists, autonomous continuation, budget) | `/goal`, Outcomes | **built-in goal mode** (`goal` tool + continuation steer + token budget) | **both have one** [src/goals/*] |
| Independent grader gate on completion | Outcomes' sub-agent grader; ultragoal's verifier subagent | **none** — completion is same-agent self-audit | **CC/ultragoal-only — the real gap** [goal-continuation.md] |
| Checkable-rubric contract + tamper-evidence | ultragoal (rubric + hash binding) | free-text objective, agent-judged | **ultragoal-only** [goal.md] |

## The two questions the brief named

**"goals"** — omp HAS a goal loop (above). What it lacks vs Claude Code's `/goal`+Outcomes and vs ultragoal: (1) an **independent grader** — omp's completion is the same agent self-auditing, where the research ultragoal is built on says a fresh-context verifier beats self-critique; (2) a **command-checkable rubric** artifact (omp's objective is free text, completion is judgment) with **tamper-evidence** (ultragoal's rubric-hash binding); (3) **enforced memory distillation** as a release condition. So ultragoal's contribution on omp is the verification rigor, not the loop. [src/goals/*, goal-continuation.md]

**"dynamic workflows"** — Not a gap. `swarm-extension` is omp's Dynamic-Workflows equivalent: "Define agent workflows in YAML — pipelines, parallel fan-outs, sequential chains, or any DAG — and run them unattended until completion," via a wave-scheduled, topologically-sorted driver that spawns subagents through `runSubprocess`. [swarm-extension] (The brief framed omp's model-role switching as "dynamic workflows," but omp uses no such term — verified absent from its README/docs; its roles are `/model` routing [README]. The real DW analog is swarm-extension; don't conflate the two.)

## Does omp already have an ultragoal equivalent?

**Partly — and that sharpens the pitch.** omp has the *loop* (objective persistence, autonomous continuation, token budget, a completion-verification discipline). It does **not** have ultragoal's *verification spine*: an independent fresh-context grader, a command-checkable rubric bound by a tamper-evident hash, and gated memory distillation. [src/goals/*, goal-continuation.md, docs/hooks.md] So a port is **additive, not redundant** — it layers rigor onto omp's existing goal mode rather than rebuilding it.

## Feasibility: the load-bearing hook finding

ultragoal's engine is a **Stop hook that blocks the end of a turn** and feeds the unmet rubric back (`exit 2`). Does omp expose an equivalent?

- **`turn_end` is observe-only.** `HookHandler<E, R = undefined>` and there is **no `TurnEndEventResult`** — a `turn_end` handler cannot block a stop, inject, or force another turn. [hooks/types.ts, docs/hooks.md] So a *literal* Stop-hook gate is not portable.
- **But completion is a blockable tool call.** omp finishes a goal via `goal({op:"complete"})`, and `tool_call` hooks **can return `{ block: true, reason }`** to halt a tool call. [docs/hooks.md, goal.md] That is the natural binding point: a hook intercepts `goal complete`, runs the independent verifier, and blocks completion until it passes — a real gate, on the real completion act.
- **And extensions can drive their own loop.** `swarm-extension` proves an extension can own a loop end-to-end (`runSubprocess`, wave iteration, unattended). [swarm-extension] A fully self-driven `/goal` command is the fallback if hook-gating proves awkward.

## Design sketch — "ultragoal for omp" (follow-up build, not this memo)

Layer ultragoal's verification spine onto omp's existing goal mode:

- **Reuse omp's goal mode** for objective persistence, the autonomous continuation steer, and the token budget — don't reinvent them. [src/goals/*]
- **Add a checkable rubric** as a file the worker maintains (ultragoal's rubric is harness-agnostic), with the rubric-hash tamper-evidence.
- **Gate completion with an independent verifier:** a `tool_call` hook on `goal({op:"complete"})` dispatches a fresh-context verifier subagent (omp subagents return **schema-validated JSON** — a clean verdict channel); on FAIL, return `{ block: true, reason: "<gap>" }` so the goal cannot complete until an independent check passes. [docs/hooks.md, README]
- **Enforce distillation:** the same hook (or a `complete` wrapper) refuses release until lessons are written to omp memory (`retain`) or markdown. [README]
- **What's lost vs Claude Code:** omp's gate would fire on the explicit `complete` call, not as an ambient backstop on *every* stop attempt; acceptable, since `complete` is the load-bearing claim anyway.
- **Effort:** moderate — a hook extension plus the verifier subagent + rubric file; far less than reinventing a loop, because omp already has one.

## Recommendation

1. The port is **worth doing and additive** — omp is popular, has the loop, and lacks exactly ultragoal's independent-verification spine.
2. Build it as a **`tool_call`-hook gate on `goal complete` + independent verifier subagent + rubric file**, reusing omp's goal mode; keep the self-driven `/goal` command as a fallback.
3. Before building, **re-verify** against current omp (it moves fast): (a) `goal complete` still routes through the `goal` tool and `tool_call` hooks still fire on it with `{block}`; (b) `turn_end` is still observe-only; (c) no independent-grader goal extension has shipped to omp's marketplace meanwhile.
4. Scope a PoC as its own goal: a minimal hook that intercepts `goal complete`, runs one verifier subagent against a rubric file, blocks on FAIL — on a throwaway repo.

## Sources

Read directly this session (high confidence) — all in `github.com/can1357/oh-my-pi`:
- README + repo tree (`/tree/main`)
- oh-my-pi `packages/coding-agent/DEVELOPMENT.md` — hook event list, `HookAPI.on`
- oh-my-pi `docs/hooks.md` — per-event return contracts (block/mutate/observe)
- oh-my-pi `packages/coding-agent/src/extensibility/hooks/types.ts` — `HookHandler` signature; `turn_end` has no result type
- oh-my-pi `packages/coding-agent/src/goals/runtime.ts`, `src/goals/state.ts` — continuation steer, token-delta accounting, statuses
- oh-my-pi `packages/coding-agent/src/goals/tools/goal-tool.ts` (surface) and `src/prompts/tools/goal.md` — `goal` tool ops
- oh-my-pi `packages/coding-agent/src/prompts/goals/{goal-mode-active,goal-continuation,goal-budget-limit}.md` — the completion/self-verification discipline
- oh-my-pi `packages/swarm-extension` (tree + README) — YAML-DAG driver extension
- oh-my-pi `docs/` directory listing — doc inventory

Not opened directly (claims tagged `[README]`/`[docs listing]`/`[inferred]`): `docs/memory.md`, `docs/skills.md`, `docs/extensions.md`, `docs/marketplace.md` contents — read at title level only.

Claude Code side: prior knowledge + this project's `docs/research-foundations.md` and `docs/research/` memos.
