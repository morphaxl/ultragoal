# ultragoal

**Tell Claude what you want once. It works until the job is verifiably done — and it gets smarter every time.**

### When you prompt, you are the loop

In a long agent session you do the real work *around* the typing: you read each output, catch the false claims, remind it what it forgot, and decide when it's done. The model types — **you** are the quality control, the memory, and the off switch. That's fine for five minutes; it collapses at five hours. Not because the model isn't capable — Fable 5 one-shots most single tasks — but because *you* don't scale. You can't review two hundred actions an hour or stay awake overnight, and the moment you stop watching, the system has zero verification left. A days-capable model run this way is capped at the speed of your attention.

**Loop engineering is the fix.** Instead of steering prompt by prompt, you design a small system around the model — a goal, a check, a memory, a stopping rule — and the system does the steering. You build the loop once; the loop does the prompting. *The model is the easy part now; writing "done" in a form a command can check is the skill.* (The full argument, with the research behind it: [docs/loop-engineering.md](docs/loop-engineering.md).)

**ultragoal is that loop, packaged — so a system, not you, does the verifying, remembering, and stopping.** You ramble (a messy voice note is fine); it interviews you on the few forks that actually change the outcome, compiles a rubric where every line is checkable by a command, and arms a loop you can walk away from — turn after turn, session after session, until an independent verifier confirms the work holds and the lessons are written down. It's the goal-loop architecture Anthropic's engineers describe using with Fable 5 (the same one Claude Code ships natively as `/goal`), with everything the published workflow still assumes an expert wires by hand — a checkable rubric, a fresh-eyes verifier, a memory discipline, a goal that survives the session — built into the harness. That's how you actually leverage a model built to run for days: the structure holds the standard, so the model's full range isn't bounded by how long you can watch it. **Goals on steroids.**

Every mechanism in the loop is research-backed — verifier design, evidence ledgers, rubric architecture, memory provenance all trace to published results from Anthropic, DeepSeek, Alibaba, ByteDance, Tencent, and academic agent-systems work. The full mechanism→evidence map lives in [docs/research-foundations.md](docs/research-foundations.md), fed by dated research sweeps in [docs/research/](docs/research/).

```
  BRIEF ──► GOAL ──► LOOP ──► VERIFY ──► DISTILL
   │          │        │         │           │
   ramble    spec    work     fresh-eyes   memory
   (voice)  +rubric  turns    subagent     grows
                        ▲                    │
                        └──── consult ◄──────┘    next session starts smarter
```

Four parts keep each other honest:

- **A real definition of done.** Every goal becomes a spec whose rubric is checkable by commands — "tests pass", "p95 under 200ms" — never vibes. In the research's words: *rubric design is the skill now; a well-designed rubric does more work than the model.*
- **Fresh eyes, not self-review.** A separate verifier agent — with no knowledge of how the work was done — re-runs every check and tries to prove the work *wrong*. Anthropic's guidance is blunt: fresh-context verifiers outperform self-critique. The gate releases only on the verifier's sign-off, and the worker is instructed never to write that verdict itself. (Like everything in Claude Code, this is a prompt-level boundary, not a sandbox — the rigor comes from the separation and the honest rubric, not from locking the worker out of a file.)
- **A loop that can't quit early.** A gate blocks Claude from stopping while the goal is unfinished — and because the goal lives in a file, it survives `/clear`, restarts, and days away. Goals are per-session: run different goals in different sessions of the same repo at once, each gated independently. Same architecture as Claude Code's built-in `/goal`, with upgrades (see [how the loop works](#how-the-loop-actually-works)).
- **Memory that compounds — for the whole team.** Every goal ends by saving verified facts, working patterns, and dead ends into your repo. Fable-class models run the continual-learning progression — fail → investigate → verify → distill → consult — largely on their own once they have somewhere durable to write. ultragoal's somewhere is **shared through git**, so every teammate's Claude feeds and consults one brain, and **provenance-tagged**, so the memory can't quietly start citing its own guesses as fact.

And the pitch in one line: **you never have to learn prompt engineering — or loop engineering.** In Anthropic's own published experiments, the engineer still hand-writes the rubric. You bring intent; ultragoal writes the expert-grade goal for itself, straight from their playbook.

## What it's for — work a plain agent session can't hold

- **The overnight build with a hard done-bar.** A bare agent stops when it *believes* it's done — and unattended, belief is all you get; Anthropic added a whole prompt block because fabricated status reports were that common. Here, stopping before an independent verifier signs off is mechanically impossible.
- **Hill-climbing a number.** "Make CI twice as fast", "get the bundle under 200KB" — experiment goals run a measure-and-ratchet loop with a frozen measure command and every attempt journaled. The verifier re-runs the final number itself, so nobody (including the agent) quietly moves the goalpost.
- **The week-long migration.** Sessions die — context fills, laptops sleep, someone types `/clear`. The goal lives in a file, not the session: next start, the banner says *"turn 9 of 25"* and the loop resumes the same contract.
- **Recurring jobs that actually compound.** Weekly dependency bumps, flaky-test hunts, doc sweeps — the gate won't release a goal until its lessons are distilled into project memory, so the fourth run is genuinely smarter and cheaper than the first instead of a fresh amnesiac. Wire it to a trigger and it's a full proactive loop: a `/schedule` routine or CI cron whose payload is `npx ultragoal run --headless "<brief>"` — the schedule finds the work, the goal finishes it ([recipe below](#put-a-goal-on-a-schedule)).
- **Delegation you can't personally review.** If you don't read code, an agent's confident summary is worthless to you. The verification log and evidence ledger — real commands, real outputs, signed by a reviewer that never saw the worker's reasoning — are a trust artifact you can act on.
- **Handing work over mid-flight.** Goal state, turn count, decision journal, and memory are git-committed. A teammate pulls, takes over the goal, and the gate holds them to the same rubric. There's no vanilla equivalent of transferring a half-finished agent engagement.
- **Work that stays done.** A goal you verify once is an assumption with a timestamp — the world drifts, and yesterday's proven thing silently stops being true. Here a finished goal *graduates*: its durable rubric checks become standing invariants in `.ultragoal/invariants/`, and `npx ultragoal invariants` re-verifies every one of them (a natural cron/`/schedule` payload; exit 1 on violations). Violations are detected, never auto-fixed — the fix goes through a new goal, with full loop discipline. Nothing you finish goes unwatched.
- **Work bigger than one goal.** When a brief would blow one goal's context or spans different verification regimes, the skill proposes a **program** — an ordered chain of goals with a verified checkpoint and a fresh context at every cut, replanned between links from what actually happened, with parallel spans only where blast radii provably don't overlap. One ratification arms the chain. The protocol: [docs/programs.md](docs/programs.md).

### Where it sits in the loop landscape

The Claude Code team's own [loop taxonomy](https://x.com/ClaudeDevs/article/2074208949205881033) sorts loops by **what you hand off**: a turn-based session hands off *the check* (verification skills), `/goal` hands off *the stop condition*, `/loop` and `/schedule` hand off *the trigger*, and a proactive loop hands off *the prompt itself*. Ultragoal is the goal-based quadrant with the rest of the hand-offs built in: the check (a rubric where every line is command-checkable, plus a fresh-eyes verifier — the 17-template library is that "encode what good looks like" layer, pre-built), the stop condition (the gate, budgets, escape hatches), and the hand-off no primitive ships — **the memory**, so each run improves the system for all future runs instead of just fixing today's instance. Put it on a schedule and you're running the proactive quadrant with the same guarantees.

## Install

```bash
npx ultragoal
```

An interactive installer walks you through it: choose **Claude Code**, **Codex**, or **both**. Claude Code remains the default for non-interactive installs (`--yes`) and can install to this project by default (it lands in `.claude/settings.json`, so teammates get it through git) or machine-wide with `--global`. If you pick Claude Code, the installer can also pre-configure the repo: the seven working-style questions, `.ultragoal/`, and the managed `CLAUDE.md` block. `--codex` installs the Codex hook-backed goal loop plugin; `--all` installs both; `uninstall` removes the selected plugins and marketplace entries. Prefer the Claude route directly? Inside Claude Code:

```text
/plugin marketplace add morphaxl/ultragoal
/plugin install ultragoal@ultragoal
```

Want it available in every project on your machine instead of just this one?

```bash
npx ultragoal --global
```

### Codex

The same contract ships for Codex: `npx ultragoal --codex` installs a Codex plugin — `$ultragoal-goal` (interview → file-backed rubric → pre-arm audit → native Goal mode), a Codex Stop-hook gate, session context hooks, and executor/verifier roles. Stop-hook blocking is **verified working** on codex-cli 0.142.x in trusted project roots; where a build treats hooks as advisory, `npx ultragoal run --codex --headless "<brief>"` enforces the same goal-file contract from outside, resuming Codex until the rubric and verdict hold. Install routes, headless semantics, roles, and known limitations: [docs/codex.md](docs/codex.md).

### Autopilot — the recommended way to run goals

```bash
npx ultragoal run "checkout is slow, get p95 under 200ms without breaking contract tests"
```

This is how ultragoal is meant to be used: one command from terminal to running goal loop. The default launches Claude Code at **full autonomy** — it makes sure the plugin is installed, then launches Claude Code with your brief armed and `--dangerously-skip-permissions`. Zero prompts of any kind until the goal is verified done. A goal loop only earns its keep when nothing blocks the turns; permission prompts are exactly the babysitting this system exists to remove — the rubric, the verifier, the budget, and the fail-open gate are the guardrails. Since Claude can run any command without asking, favor repos you can reset (git is your undo) or a container, and know your three dials: `--safe` keeps permission guardrails on (auto mode: tools auto-approved within turns, sensitive actions still ask), `--worktree` runs the goal in a fresh git worktree (an isolated checkout on its own branch — the natural pairing for full autonomy, and how parallel goals on one repo keep out of each other's files), and `--headless` runs the whole loop non-interactively, exiting when the goal completes — supervised: if the underlying `claude` process dies mid-goal (a crash, a rate limit, a safety refusal), the runner reads the goal file and resumes the run against it, so the exit code reflects the goal's actual state, not the process's luck (cap: `ULTRAGOAL_RUNNER_MAX_TURNS`, default 25).

For Codex, add `--codex` (interactive: interviews, recaps, waits for **Arm goal**; `--headless`: records defaults and runs `codex exec` to completion — see [docs/codex.md](docs/codex.md)).

### Put a goal on a schedule

`npx ultragoal run --headless "<brief>"` is a complete, self-verifying unit of work — which makes it the natural payload for anything that fires on a clock or an event:

- **A Claude Code routine**: `/schedule every Monday 9am: /ultragoal:goal bump dependencies — all tests green, no major versions without reading the changelog`. A project-scoped install travels with the repo (`.claude/settings.json` + `.ultragoal/` through git), so the routine gets the full harness and the repo's memory wherever it runs.
- **CI or cron**: a nightly job that runs `npx ultragoal run --headless "fix any test that failed in tonight's suite; never weaken an assertion"` on a branch and opens a PR. The exit code is trustworthy — the runner reports success only when the goal file proves verified done.

This is the proactive loop the Claude Code team describes — schedule + goal + verification + auto mode — plus the two things the bare composition doesn't give you: an independent verifier on every completion, and enforced distillation, so Monday's run starts from last Monday's lessons instead of from zero. Anthropic's own Routines docs warn that a green run status doesn't mean "task success" — read the transcript. That warning is this plugin's founding premise: a scheduled loop nobody watches is exactly where self-graded "done" rots, so here nothing reports success until an independent verifier re-ran the checks against the goal file.

Requires Claude Code ≥ 2.1.139. The hook scripts are POSIX shell — on Windows, Claude Code runs them via Git Bash (installed with Git), or use WSL. Updates take care of themselves: project-scoped installs never auto-update natively, so ultragoal's session hook refreshes the pin in the background, at most once a day, applying on your next session (opt out with `auto-update: off` in `.ultragoal/config.md`). `npx ultragoal update` remains the manual Claude sweep — every install, user scope plus all per-project pins, in one go; use `npx ultragoal update --codex` or `--all` for the Codex loop. Uninstall with `npx ultragoal uninstall` (tries both installed surfaces; add `--codex` or `--claude` to target one, and `--purge` to also remove a repo's `.ultragoal/` data). Working in a monorepo or multi-repo workspace? Put `.ultragoal/` at the workspace root — the hooks walk up to the nearest one, so all nested repos share a single brain.

## Sixty seconds to your first goal

```text
/ultragoal:goal okay so the checkout flow is slow and users are bouncing, I think it's
the inventory check, we talked about caching it last week, anyway it needs to be under
200ms and definitely don't break the contract tests, oh and there's that weird race
condition ticket too maybe related...
```

That's a real, unedited ramble — exactly what it's built for. Ultragoal will:

1. **Consult** project memory and scan your repo with parallel subagents before asking you anything.
2. **Interview** you on the decisions that actually steer the outcome — approach, the definition of "done", what's explicitly out of scope, which tradeoff to favor — never trivia it could look up. Each is a concrete fork with a recommended default, so you ratify fast or override deliberately.
3. **Spec** the goal: objective with the *why*, a rubric where every item has an exact check command, stop conditions, and constraints — then runs a pre-arm rubric audit before showing you.
4. **Recap before building** — what it understood you want, which way each decision went (including calls it made for you), what it's about to do, what it will take in rough terms (a depth tier — quick pass / standard / deep — plus expected subagent fan-outs; never time estimates), and how it'll know it's done. Your last cheap moment to redirect, before a single line changes.
5. **Arm the loop** on your yes. From here a Stop-hook gate blocks the end of every turn and feeds the remaining rubric back, so Claude keeps working without you prompting each step.
6. **Verify** with a separate fresh-context subagent that re-runs every check itself and tries to *refute* the claims — because models grade their own work generously, and independent verifiers don't.
7. **Distill** before it's allowed to finish: verified lessons, working patterns, and dead ends are written to `.ultragoal/memory/`, so the next goal starts smarter.

Walk away mid-goal, close the laptop, `/clear` — the goal survives. Next session opens with a banner: *"Active goal 'checkout-latency' — turn 9 of 25."*

Want better goals from the first try? [docs/briefing-guide.md](docs/briefing-guide.md) lists the high-value signals — done-criteria, scope edges, constraints, where logs live — that turn a twenty-question interview into a two-question one.

## Two kinds of goals

**Task goals** — "build this, fix this, migrate this." Done means the checklist holds.

**Experiment goals** — "make this number better." When the brief is an optimization (build time, latency, bundle size, test runtime), ultragoal compiles it into a measure-and-ratchet loop modeled on Karpathy's [autoresearch](https://github.com/karpathy/autoresearch): establish the baseline first, then one change per experiment — commit, measure with an immutable command, keep only if the number strictly improved, `git reset` if it didn't. Every attempt lands in `results.tsv` (keeps, discards, *and* crashes), and since each row carries its commit hash, any discarded idea's full diff stays recoverable. The verifier re-runs the final measurement itself and fails the goal if the measure command was ever touched — no moving goalposts. The same pattern took Shopify from "one-shot 'make it faster' prompts fail" to a 65% faster build, unattended.

Either kind starts from the **rubric library** when the brief matches a known domain: 17 research-backed templates (Next.js features, web performance, accessibility, API quality, security, bug fixes, refactors, test health, CI speed, dependency upgrades, CLI tools, docs, React Native, app-store readiness, realtime stability, research/audit memos) with every threshold cited — Core Web Vitals, WCAG 2.2, OWASP 2025, Google's engineering practices — and every item carrying the command that proves it. A QA capability map tells the spec when a claim needs browser observation, simulator screenshots, real-device/manual evidence, live-service smokes, or failure-mode checks instead of static proxies. A mechanical rubric audit flags weak drafts before the goal can be armed. Templates also recommend skills worth pairing, like Vercel's react best-practices skills from [skills.sh](https://skills.sh).

## Commands

| Command | What it does |
|---|---|
| `/ultragoal:goal <brain dump>` | The front door: interview → spec → armed loop → execution |
| `/ultragoal:status` | Dashboard: rubric progress, turn budget, last verdict, memory health, goal history trends |
| `/ultragoal:verify` | Independent audit of any goal — fresh-context verifier re-runs every check |
| `/ultragoal:stop` | Bail out gracefully — pause or abandon, gate releases instantly |
| `/ultragoal:remember` | Distill lessons from the current session into memory |
| `/ultragoal:compact` | Memory hygiene pass — merge, generalize, drop stale (nudged every ~10 sessions) |
| `/ultragoal:setup` | First-run init / change preference knobs (runs automatically on first goal) |

## What it creates in your repo

Everything the plugin produces is plain markdown you own — editable, diffable, git-shareable. The engine ships in the plugin; the state lives with you.

```
.ultragoal/
├── config.md            # your knobs — hand-editable
├── stats.tsv            # one row per finished goal: turns, verifier fails, outcome —
│                        #   "rubric design is the skill"; this is its scoreboard
├── harness-log.md       # opt-in (harness-log knob): when the harness itself misbehaves,
│                        #   a self-observation of why + how to improve it. local only.
├── goals/
│   ├── active/
│   │   └── <slug>/      # one directory per live goal (concurrent across sessions)
│   │       ├── goal.md  #   the spec: rubric, verification log, decision journal
│   │       └── results.tsv  # experiment goals: every attempt with its commit hash
│   └── archive/         # finished and abandoned goals (their journals feed memory)
├── invariants/          # graduated rubric checks — one predicate per file,
│                        #   re-verified forever by `npx ultragoal invariants`
└── memory/
    ├── MEMORY.md        # index + fixed slots (commands, invariants, gotchas, hot files)
    ├── facts.md         # what's true of this repo
    ├── patterns.md      # approaches that worked, and why
    └── failures.md      # dead ends, so no future session repeats them
```

Memory files are two-layered, borrowing the structure of [Karpathy's LLM-wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) and Garry Tan's gbrain: **compiled truth above the line** — rewritten as understanding improves — and an **append-only, dated evidence log below it** that is never edited. Every claim carries its provenance — `[VERIFIED · ran the command]`, `[READ · from docs]`, `[INFERRED]`, `[USER-CORRECTION]` — so confident prose can never quietly masquerade as checked fact. The known failure of agent memory is the closed loop that cites its own past guesses as sources; provenance is the structural fix, and the compaction pass cleans the synthesis without ever touching the evidence. When the repo has moved a lot since memory was last fed, the session banner says so and tells Claude to re-verify before trusting.

This puts ultragoal in the same lineage as Google Cloud's [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf) (OKF) — version-controlled markdown that agents write and humans curate, no runtime and no SDK. We **align** with OKF's conventions (an index for progressive disclosure, a dated update log, plain-markdown cross-links, citations; goal specs even carry OKF-style `type` frontmatter) and **extend** it with the per-claim provenance and two-layer evidence model that OKF v0.1 doesn't specify. We deliberately *don't* adopt OKF's one-concept-per-file catalog shape — a per-repo lesson store isn't an asset catalog — so this is alignment and extension, not full conformance. The relationship is mapped in detail in [DESIGN.md](DESIGN.md).

Plus a small fenced block in `CLAUDE.md` (shown to you before it's written) wiring the memory protocol and your chosen style knobs.

Memory is **git-committed by default**: it's your team's growing brain — every teammate's Claude consults and feeds the same one. Choose local-only at setup if you prefer.

**One brain, not two.** Claude Code ships its own per-project auto memory (v2.1.59+, on by default) — machine-local, injected each session, and where "remember X" lands. Left alone, that's a second memory competing with this one. Setup unifies them by default: it points Claude Code's `autoMemoryDirectory` at `.ultragoal/memory` (a per-machine key in `.claude/settings.local.json`, added only if absent), so native memory writes feed the shared, provenance-tagged store and the session banner stops injecting the index a second time. Teammates get a one-line nudge to add the key on their machine. Prefer keeping native memory personal? Set `auto-memory: separate` in `.ultragoal/config.md` — native stays your machine-local scratchpad, `.ultragoal/memory` stays the team's truth.

## The knobs

Seven questions at first run, stored in `.ultragoal/config.md`, each backed verbatim by Anthropic's official prompting guidance:

| Knob | Options (default first) |
|---|---|
| Rigor | vanilla · standard · max — how much scaffolding the harness adds; match it to model strength (see below) |
| Action mode | proactive · conservative |
| Communication | lead-with-outcome · detailed |
| Scope discipline | polish-welcome · minimal |
| Memory sharing | git-committed · local-only |
| Verification | on · off — off lets goals finish on a fully checked rubric + saved lessons, skipping the independent verifier pass |
| Harness-feedback log | off · on — opt-in: when you flag a harness mistake, ultragoal records why it failed + how to improve, to a local `.ultragoal/harness-log.md` (never transmitted; sharing is manual) |

Change them anytime with `/ultragoal:setup` or by editing the markdown.

### Rigor — one harness, three model tiers

The same loop works for a frontier model and a small one; what changes is how much verification scaffolding it needs. `rigor` is the dial, and it's the project's answer to "the advanced techniques are over-prescriptive on a strong model" — they're opt-in, not removed.

- **vanilla** (default) — for strong models like Fable. The article's pure loop: one fresh-context verifier at the final sign-off, no scouts, no monitor. A capable model self-corrects against an honest rubric; piling on redundancy just costs tokens.
- **standard** — bells and whistles, modest cost: the single grader plus interim re-checks on shaky items, pessimistic double-runs near thresholds, 2–4 research scouts for read-heavy work, and a background log monitor that surfaces errors from the goal's logs.
- **max** — every recommended technique, for **lower-intelligence models** or release-grade stakes: a **3-lens verification panel** (checks / refute / constraints, all must PASS — mutually-blind subagents), every-claim cadence, multi-modal scout sweeps with a completeness critic, deep interview, and rubric variants. A weaker model can't catch its own blind spots in one pass; three diverse judges and redundant searches buy back the reliability — and research (aspect-lens ensembles, guard-agent mid-trajectory checks, 2–3-judge saturation) says that's exactly where the gains are. Set it once, or per goal by saying "max mode" in a brief.

The engine stays simple — the gate only knows `verify: off | on | panel`; rigor lives in the goal skill, which expands it into the concrete loop above.

## How the loop actually works

`/goal` in Claude Code is a Stop hook under the hood: something checks a condition after every turn and blocks the stop until it holds. Ultragoal ships that same architecture — the steroids are four specific differences:

- **The model can arm it.** Claude can't invoke built-in `/goal` itself; it *can* write a goal file, which is all the ultragoal gate needs. One skill takes you from ramble to running loop.
- **It persists, and it's per-session.** A native `/goal` lives only in its session: `/clear` kills it, resuming resets its counters, and nothing of it survives as an artifact. The ultragoal gate reads files keyed by session, so a goal spans sessions, `/clear`s, and days — and different sessions in the same repo can each run their own goal concurrently, with the gate enforcing only the one you armed in the session that's stopping.
- **The judge runs commands.** Native `/goal`'s evaluator only reads the transcript — the self-report channel. Ultragoal's gate is deterministic (free, instant), and completion requires a fresh-context verifier that re-ran the checks itself.
- **Finishing requires learning.** The gate won't release until lessons are distilled to memory. Failed goals distill too — `failures.md` exists so the next attempt doesn't repeat them.

Every goal spec also includes a one-line **native `/goal` fallback**, handy for one-off headless runs: `claude -p "/goal ..."`.

### Escape hatches

Loops need brakes. Every rubric must carry stop conditions; every goal has a budget of gate-checked turns, chosen as a depth tier — quick pass / standard / deep — when the goal is armed (default 25). A turn is the gate's own event, counted with zero machinery that could miscount it; at the limit the gate demands an honest status report, and if that's ignored it pauses the goal itself and tells you it did; `/ultragoal:stop` releases it instantly; and the gate **fails open** on any script error. It cannot trap a session. The gate also binds to the session that armed the goal — open a second Claude session in the same repo for a quick side question and it stays free (the banner tells it how to take the goal over if you want that). Verifier verdicts are cryptographically dull but effective: each one is bound to a hash of the rubric it was issued against, so a stale PASS — or a quietly weakened rubric — never releases the gate. The engine has a regression suite (`tests/gate-test.sh`) run in CI on every push.

### Footprint

Always-on context cost is a handful of skill descriptions — on the order of a hundred tokens. Everything else loads when invoked. When no goal is active, the gate is a single file-existence check.

## Where this comes from

- Lance Martin (Anthropic), [*Designing loops with Fable 5*](https://x.com/RLanceMartin/article/2064397389189071163) — loops over prompts; rubric design as the skill; verifier subagents over self-critique; the fail → investigate → verify → distill → consult progression this plugin mechanizes. His experiments run on the native primitives with a hand-written rubric — ultragoal is that practice, packaged.
- Anthropic, [*Prompting Claude Fable 5*](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5) — the verbatim behavior blocks behind the knobs, the memory protocol, and the verification guidance.
- Anthropic, [*Prompting best practices*](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) and the [Claude Code docs](https://code.claude.com/docs) on `/goal`, hooks, skills, and sub-agents.
- The Claude Code team, [*Getting started with loops*](https://x.com/ClaudeDevs/article/2074208949205881033) — the official loop taxonomy (turn-based / goal-based / time-based / proactive, sorted by what you hand off) this README's landscape section maps ultragoal onto, and the source of the "encode it to improve the system for all future iterations" discipline the distill step mechanizes.
- Andrej Karpathy, [autoresearch](https://github.com/karpathy/autoresearch) — the experiment ratchet behind experiment goals: baseline-first, strict improvement, keep/revert via git, every attempt journaled, the evaluator immutable.
- Karpathy's [LLM-wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) and Garry Tan's gbrain — the memory architecture: compiled truth over append-only evidence, per-claim provenance, lint-style maintenance.
- Avid's [Agentic OS builder's guide](https://x.com/av1dlive/status/2074169173178212621) — the standing-goals graduation pattern behind `.ultragoal/invariants/` ("a goal you only verify once is an assumption with a timestamp"), the earned-autonomy framing behind the arm-time stats glance, and the "a number, a never, or a command" constraint test.
- Google Cloud's [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf) (OKF v0.1) — convergent prior art for markdown-as-knowledge; ultragoal aligns with its conventions and extends them with provenance + a two-layer evidence model (see the memory section and DESIGN.md §7.5).

Design rationale, trade-offs, and the competitive landscape live in [DESIGN.md](DESIGN.md).

## FAQ

**Fable 5 already handles long-horizon work — why add a harness?** Not to make the model capable; the loop primitives are native and the model is built for them. Two things survive that fact. First, the published workflow still assumes expertise: in Anthropic's own experiments the engineer hand-writes the nine-criteria rubric, knows to spawn a fresh-context verifier, and runs a memory discipline — ultragoal does those for you. Second, one problem is structural, not a capability gap: a worker grading its own work fails in every model generation, which is why Anthropic's guidance reaches for an independent verifier *with Fable 5 specifically*. The gate makes that separation mechanical instead of habitual.

**Do I need to know how to prompt?** No — that's the point. You bring what only you know (what you want, who it's for, what must not break); ultragoal writes the expert-grade brief for itself. You review a plan in plain English, never author a prompt.

**Versus ralph-loop?** Ralph re-feeds the same prompt until a promise appears. Ultragoal adds the parts the article argues matter: a rubric with per-item check commands, an independent verifier, persistent cross-session goals, and enforced distillation into memory.

**Versus Managed Agents "Outcomes"?** Anthropic's API-side Managed Agents now offer Outcomes — a hosted define-rubric → iterate → independent-grader loop. Same thesis, different home: Outcomes runs server-side per agent request; ultragoal runs in your repo, on any Claude Code (or Codex) session, writes everything as diffable markdown you own, spans sessions and days, and compounds through git-shared memory — plus it *authors* the rubric for you from a ramble instead of asking you to supply one. If your workload lives in the Managed Agents API, use Outcomes; if it lives in your editor and CI, this is that loop, portable.

**Does the verifier have its own context, or does it grade in the same conversation?** Its own. The verifier is a separate subagent with a fresh context window and no access to the worker's reasoning — it only sees the goal file and what it learns by re-running the checks itself. (It does share the Claude Code process and permissions; for absolute isolation on high-stakes work, run `/ultragoal:verify` from a separate headless session as documented in that skill.)

**How do I change my setup answers later?** They're just markdown: edit `.ultragoal/config.md` directly (flip `verification` to `off`, change `scope`, anything), or re-run `/ultragoal:setup` to be re-asked interactively. Changes apply to the next goal you arm.

**Does it spend a lot of tokens?** The gate itself is free (no model call). The loop spends what the work needs — that's the point of goal-directed runs. Budgets cap the blast radius — pick the depth tier when arming (a quick pass for your first goal) to calibrate. And for execution-heavy goals there's an **economy dial**, offered beside depth and rigor when it can actually change the bill: the session model stays orchestrator and advisor — interview, spec, decisions, diff review, verification — while cheaper Sonnet executor subagents do the implementation, escalating up when stuck. It's Anthropic's published plan-big-execute-small pattern (their numbers: a Fable 5 orchestrator with Sonnet 5 workers keeps 96% of Fable's quality at 46% of the price; the inverse advisor shape, ~92% at ~63%), and ultragoal is unusually well-placed to run it: cheap executors are only safe when the checking around them is strong, and the rubric + independent verifier are exactly that checking. The verifier is never downgraded.

**Can I run it unattended?** Yes — that's the recommended mode: `npx ultragoal run "<brief>"` launches at full autonomy, and `--headless` runs the loop to completion with no UI at all. The discipline lives in the rubric, the verifier, and the budget — not in you approving each tool call.

**Uninstall?** `npx ultragoal uninstall` removes the Claude and/or Codex plugin plus marketplace entries it can find; your `.ultragoal/` state stays — it's yours. Add `--codex` or `--claude` to target one surface, and `--purge` to delete a repo's state too.

## License

MIT · [Privacy](PRIVACY.md): no data collection — everything is local markdown in your repo.
