# Ultragoal — System Design

> **One-line pitch:** The workflow Anthropic engineers actually use with Fable 5 — brief, goal, loop, verify, distill — packaged as a one-command Claude Code plugin.

> **2026-06-12 — design-era snapshot, kept for rationale.** Shipped behavior has moved past parts of this document: goals live per-session in `goals/active/<slug>/` (not a single `active.md`), setup asks seven knobs (incl. rigor and the opt-in harness-feedback log), the shipped scope default is polish-welcome, and budgets are chosen as depth tiers (quick/standard/deep) when arming. README.md and AGENTS.md describe what ships today; read this file for the why, not the what.

This design distills three primary sources into one cohesive product:

1. **Lance Martin's "Designing loops with Fable 5"** (X article, June 9 2026) — loop design over direct prompting; `/goal` + Outcomes; rubric design as *the* skill; verifier subagents over self-critique; the fail → investigate → verify → distill → consult memory progression.
2. **Anthropic's official ["Prompting Claude Fable 5" guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5)** — verbatim prompt blocks for autonomy, verification, memory, communication, and scope control.
3. **Anthropic's ["Prompting best practices"](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)** + [Claude Code docs](https://code.claude.com/docs) (`/goal`, hooks, skills, plugins, sub-agents, memory).

---

## 1. Philosophy → Mental model

The article's thesis (quoted identically across sources, so near-verbatim):

> "Rather than directly prompting and steering Fable 5, it's often better to design loops that let the model self-correct in response to environment feedback (e.g., /goal or Outcomes) and manage its own context (e.g., via memory)."

> "A well-designed rubric is doing more work than the model… Rubric design is the skill now, the model is the easy part."

The product's mental model is **five verbs, one loop**:

```
  BRIEF ──► GOAL ──► LOOP ──► VERIFY ──► DISTILL
   │          │        │         │           │
   ramble    spec    work     fresh-eyes   memory
   (voice)  +rubric  turns    subagent     grows
                        ▲                    │
                        └──── consult ◄──────┘   (next session starts smarter)
```

This maps 1:1 to the continual-learning progression from the article (fail → investigate → **verify** → **distill** → **consult**) and to how Anthropic engineers describe their own workflow: give Claude the hardest version of the problem, a checkable rubric, fresh-context verification, and a place to write down what it learned.

**Design north stars (from competitive research):**

- **Near-zero always-on context.** Official `ralph-loop` plugin = ~84 always-on tokens; `ruflo`'s ~300K-token bloat became a public scandal. Target: <150 tokens always-on; everything else loads on invoke.
- **Engine read-only, state user-owned.** The plugin (logic) is versioned and auto-updating; everything it produces — goal specs, rubrics, memory, config — is plain markdown in the user's repo: editable, diffable, git-shareable. This is what users praise in CCPM/GSD.
- **Loop inside the session, not a bash wrapper.** Stop-hook architecture (the official ralph-loop pattern, and literally what `/goal` is under the hood) — cancellable, permission-aware, no orphan processes.
- **Don't over-prescribe Fable 5.** The official guide warns that skills written for prior models are "often too prescriptive" and degrade output. Skills state outcomes and protocols, not step-by-step scripts.

---

## 2. The core engine: a persistent, rubric-gated goal loop

### Why not just native `/goal`?

Native `/goal` (v2.1.139+) is a session-scoped prompt-based Stop hook: after each turn a Haiku evaluator judges the condition against the transcript. It's excellent — but:

| | native `/goal` | ultragoal loop |
|---|---|---|
| Started by | user typing it | **the model, at the end of the interview skill** (the docs expose no way for Claude to invoke built-in commands) |
| Lifetime | dies with the session (`/clear` kills it) | **persists across sessions/days** — state lives in a file; the plugin Stop hook re-engages on resume |
| Evaluator | Haiku reads the transcript | **deterministic gate** (free, instant) + **fresh-context verifier subagent** reads the *artifacts* (the article: verifiers beat self-critique; transcript-only judging is exactly the self-report channel the guide warns about) |
| Completion | condition judged true | rubric checked **and** verifier sign-off recorded **and** lessons distilled |

We keep full compatibility: every goal spec includes a one-line native `/goal` condition the user can run instead, and the README teaches both. We compose with the platform, not against it.

### The gate (Stop hook, `type: command`)

`scripts/goal-gate.sh`, shipped in the plugin, registered on `Stop`:

1. **No active goal** (`.ultragoal/goals/active.md` absent or `status != active`) → `exit 0`. Cost: one stat call. This is the every-day case; the plugin is invisible when idle.
2. **Active goal** → increment the turn counter (sidecar `.ultragoal/goals/.turns`); then:
   - **Stop condition hit** (turn budget reached, or a stop-condition marker the model wrote) → allow stop, print a "budget reached — report honestly where things stand" reminder.
   - **Rubric has unchecked items, or no verifier PASS recorded** → `exit 2`; stderr = the unchecked rubric items + the loop protocol reminder (verify with the verifier subagent, record evidence, never self-certify).
   - **Rubric complete + verifier PASS, but lessons not yet distilled** → `exit 2` once more: "Rubric verified. Distill lessons into `.ultragoal/memory/` per the protocol, archive the goal, then finish." → **distillation is mechanically enforced by the loop itself.**
   - **Goal archived** → `exit 0`. Done.

**Fail-open invariant:** any script error → `exit 0`. The plugin must never be able to brick a session.

**Escape hatches** (lesson from Ralph-loop forks): `/ultragoal:stop` archives the goal as `abandoned` (gate releases instantly); turn budget is mandatory in every spec (the article's #1 rubric anti-pattern is "missing stop conditions"); Ctrl+C still works; `Esc` interrupts a turn as usual.

### The goal spec (`.ultragoal/goals/active.md`)

User-owned, editable mid-flight (it's just markdown — edit the rubric and the gate picks it up next turn):

```markdown
---
slug: checkout-flow-rewrite
status: active            # active | paused | done | abandoned
budget: 25                # max turns before forced pause
created: 2026-06-10
---

# Objective
<one paragraph: outcome + why it matters + who it's for>   ← "give the reason, not only the request"

# Context
<distilled from the brain-dump interview: constraints, prior art, links>

# Rubric                    ← every item checkable by a command, never vibes
- [ ] All checkout unit tests pass — check: `pnpm test src/checkout` exits 0
- [ ] p95 latency under 200ms — check: `node bench/checkout.js` reports p95 < 200
- [ ] No other test file modified — check: `git diff --stat main -- 'test/**'` only touches checkout
- [ ] VERIFIER: independent sign-off recorded below

# Stop conditions
- 25 turns reached, or the same rubric item fails 3 consecutive verification attempts

# Constraints
<what must NOT change>

# Verification log            ← only the verifier subagent appends here
# Decision journal            ← the worker logs structural decisions + dead ends (feeds distill)

# Native fallback
/goal all rubric items in .ultragoal/goals/active.md are checked with evidence, or stop after 25 turns
```

---

## 3. The user journey (DX walkthrough)

### Install — one command, zero config

```bash
# terminal, one line:
claude plugin marketplace add <owner>/ultragoal && claude plugin install ultragoal@ultragoal
```
```text
# or inside Claude Code:
/plugin marketplace add <owner>/ultragoal
/plugin install ultragoal@ultragoal
```

The repo doubles as its own marketplace (`.claude-plugin/marketplace.json`). Day-one submission to `anthropics/claude-plugins-community` gets us SHA-pinned distribution with CI auto-bump; official-marketplace curation (`/plugin install ultragoal@claude-plugins-official`, the superpowers path) is the endgame. A `npx ultragoal` shim that shells out to the two commands above is a fast follow for README ergonomics. Team rollout: `--scope project` commits `enabledPlugins` to `.claude/settings.json` — teammates get prompted automatically on trust.

**No setup step.** First use of any skill lazy-initializes `.ultragoal/` (3 preference questions, ~60 seconds, see §5). `/ultragoal:setup` exists only for teams that want to pre-commit config.

### Daily flow — one skill is the front door

```
/ultragoal:goal <paste your Wispr Flow ramble — messy is fine>
```

1. **Consult** — reads `.ultragoal/memory/MEMORY.md` + relevant topic files; scans the repo with parallel Explore subagents (cheap, fresh-context).
2. **Interview** — extracts objective/constraints/context from the ramble; asks **only** what it cannot infer with stated confidence (batched AskUserQuestion, typically 2–5 questions: success criteria it can't derive, ambiguous scope boundaries, missing "why"). Voice-first by design: the skill is explicitly prompted to treat input as an unedited speech transcript (fillers, repairs, topic jumps).
3. **Spec** — drafts the goal file; a `rubric-critic` forked review pass attacks it for vagueness, unmeasurable criteria, and missing stop conditions (the article's anti-patterns) before the user sees it.
4. **Confirm** — shows the spec; on yes, writes `active.md`. **The loop is now armed** — the same session keeps working turn after turn; the gate blocks every stop until verified + distilled.
5. **Work / Verify** — worker executes; at checkpoints (every N turns / before claiming any rubric item) dispatches `ultragoal:verifier` — a fresh-context subagent that re-runs the check commands itself and adversarially tries to *refute* each claim. Sign-offs land in the verification log.
6. **Distill** — gate enforces it: verified lessons (with evidence) go to memory, goal archives to `goals/archive/`, loop releases, Claude reports with the official "ground progress claims" discipline.

### Walk away and come back

The goal survives `/clear`, laptop sleep, days. On every session start, a `SessionStart` hook injects a tiny banner: active goal, turn N of budget, memory index head. Resume = just keep talking, or `claude -p ""` in CI. `/ultragoal:status` shows the full picture; `/ultragoal:stop` bails out gracefully (and still offers to distill what was learned — failures are memory too, per `failures.md`).

### Codex loop path

Codex now gets the same file-backed loop contract through a separate
`ultragoal-codex` plugin. It packages `$ultragoal-goal`, a Codex Stop hook gate,
and a SessionStart context hook. Interactive Codex users may need to review hook
trust with `/hooks`; `npx ultragoal run --codex --headless "<brief>"` launches a
vetted `codex exec` run with hook trust bypassed for automation. After each turn,
the runner reads the active goal file and resumes with `codex exec resume --last`
when unchecked items, missing evidence, or missing verifier/panel verdicts
remain. If a Codex build honors Stop-hook blocking, the gate blocks early exits
like the Claude gate. If a build treats hooks as advisory, this durable goal-file
inspection is the enforcement fallback.

### Every session benefits, even without a goal

The memory consult/distill protocol and the style config apply to normal sessions via the CLAUDE.md block — the goal loop is the flagship, not a prerequisite.

---

## 4. Components (plugin anatomy)

```
ultragoal/                          # GitHub repo = plugin = marketplace
├── .claude-plugin/
│   ├── plugin.json                 # name, version (semver), skills/agents/hooks paths
│   └── marketplace.json            # self-hosting marketplace
├── skills/
│   ├── goal/SKILL.md               # flagship: interview → spec → arm loop  (+rubric-guide.md, interview-guide.md)
│   ├── status/SKILL.md             # goal + memory + budget dashboard
│   ├── stop/SKILL.md               # graceful abandon (archives, offers failure-distill)
│   ├── remember/SKILL.md           # manual distill ("save what we just learned")
│   ├── compact/SKILL.md            # memory compaction pass (dedupe, drop stale, ~10-session cadence)
│   └── setup/SKILL.md              # optional explicit init / reconfigure knobs
├── agents/
│   └── verifier.md                 # fresh-context adversarial verifier (read-only + Bash; refute, don't confirm)
├── hooks/hooks.json                # Stop → goal-gate.sh; SessionStart → session-context.sh
├── scripts/
│   ├── goal-gate.sh                # the loop engine (§2) — deterministic, fail-open
│   └── session-context.sh          # injects memory index head + active-goal banner (capped ~25KB/200 lines)
├── plugins/ultragoal-codex/        # Codex plugin: skill + bundled hooks + Codex gate scripts
└── README.md · DESIGN.md · LICENSE
    (templates ship as skill supporting files; source guides are linked, not redistributed)
```

What it creates in the **user's repo** (all theirs, all git-friendly):

```
.ultragoal/
├── config.md                       # the knobs (§5) — plain markdown, hand-editable
├── goals/  active/<slug>/{goal.md · .turns · .rubric-hash · results.tsv} (one per session) · archive/
└── memory/ MEMORY.md (index) · facts.md · patterns.md · failures.md
CLAUDE.md                           # gains a small fenced block: <!-- ultragoal:start --> … <!-- ultragoal:end -->
```

### The verifier (the article's biggest lever)

`agents/verifier.md` — `model: inherit`, read-only tools + Bash, **no access to the worker's reasoning** (fresh context is the point — the article reports 89% vs 62% eval accuracy for independent verifiers vs self-critique). Its prompt: *re-run every check command yourself; your job is to refute each rubric claim, not confirm it; default to FAIL when evidence is missing; append a structured verdict (item / command run / output / PASS|FAIL / note) to the verification log.* The official guide's instruction is baked into every goal: "Establish a method for checking your own work at an interval… verifying your work with subagents against the specification."

### The memory system (continual learning, the article's format)

- `facts.md` — verified facts with `[VERIFIED S<n>]` / `[UNVERIFIED]` tags + evidence
- `patterns.md` — approaches that worked, and **why**
- `failures.md` — dead ends, so no future session repeats them
- `MEMORY.md` — the index; head injected each session (consult step), kept under the same 200-line/25KB cap Claude Code's own auto-memory uses
- Protocol (in the CLAUDE.md block + distill skill, per official guide verbatim): one lesson per entry with a one-line summary; record corrections **and** confirmed approaches with the why; don't save what the repo/git history already records; update rather than duplicate; delete what proves wrong.
- `/ultragoal:compact` every ~10 sessions (session counter in `.state.json`; the SessionStart banner nudges when due).
- **Committed to git by default** → the memory is the *team's* growing brain, multiplying across teammates' Claude sessions. Opt-out to gitignore at init for solo/private work.

---

## 5. Customizability — knobs, not forks

All knobs are **official Anthropic prompt blocks, verbatim**, selected at first-run (AskUserQuestion) and stored in `.ultragoal/config.md`; the CLAUDE.md block includes the chosen ones. Re-run `/ultragoal:setup` anytime, or just edit the markdown.

| Knob | Options (default bold) | Source text injected |
|---|---|---|
| Rigor | **vanilla** / standard / max | meta-knob: the goal skill expands it into the loop's verification/scout/interview shape — see below |
| Action mode | **proactive** / conservative | `<default_to_action>` vs `<do_not_act_before_instructions>` (best-practices doc) |
| Communication | **lead-with-outcome** / detailed | Fable-5 guide readability + brevity blocks |
| Scope discipline | **minimal** / elaborate-ok | anti-overengineering block (Fable-5 guide §effort) |
| Safety posture | **balanced** / paranoid / trusted | reversibility-confirmation block (best practices) |
| Verification cadence | **every rubric claim** / every N turns | verifier-dispatch instruction parameter |
| Default loop budget | **25 turns** | gate default in config |
| Memory sharing | **git-committed** / local-only | .gitignore entry at init |

Always-on regardless of knobs (they're not preferences, they're how Fable 5 works best): grounded progress claims, parallel subagent usage, investigate-before-answering, memory protocol, autonomous-loop reminder during active goals.

### Rigor — scaling the harness to model strength

`rigor` is the one knob that reshapes the loop rather than injecting a prompt block. It exists because the advanced techniques (panel verification, multi-modal sweeps, mid-trajectory monitoring) measurably help a *weak* model but are over-prescriptive on a strong one — the Fable-5 guide's own warning. Rather than choose, ultragoal makes the scaffolding a dial:

- **vanilla** (default, strong models): single fresh-context verifier at the final sign-off, no scouts, no monitor — the article's lean recipe, byte-for-byte today's behavior.
- **standard**: single grader + interim re-checks on shaky items + pessimistic double-runs + 2–4 research scouts + background log monitor.
- **max** (weaker models / release stakes): 3-lens panel verification (`verify: panel` — checks/refute/constraints, all PASS), every-claim cadence, multi-modal scout sweeps + completeness critic, deep interview, rubric variants.

The separation that keeps this from bloating the engine: the **gate** understands only `verify: off | on | panel` (deterministic, ~15 lines for the panel branch); the **goal skill** reads `rigor` and expands it into concrete choices. Intelligence lives in the prose that loads on invoke, not in always-on context or the shell. Per-goal override: "max mode" / "vanilla" in a brief. Evidence for the max techniques: aspect-lens ensembles (+10–20%), guard-agent mid-trajectory checks beating end-only on noisy work, MacNet's 2–3-judge saturation (the panel is exactly 3) — all in [docs/research-foundations.md](docs/research-foundations.md).

---

## 6. What we deliberately did NOT build

- **No swarm orchestration / 100 agents** — ruflo's failure mode. The recipe stays one worker + a verifier (single, or a 3-lens panel at rigor=max) + Explore scouts; the panel is capped at 3 because the ensemble gain saturates there.
- **No bash wrapper loop** (Ralph-original style) — the Stop hook is in-session, cancellable, permission-aware.
- **No custom issue tracker / PM layer** (beads/CCPM territory) — goals are files; git is the tracker.
- **No model-side "echo your reasoning"** anywhere — triggers Fable 5's `reasoning_extraction` refusals (guide §scaffolding).
- **No always-on lecture context** — every byte the plugin injects per-session is budgeted and visible.

## 7. v0.2 — borrowed from autoresearch and gbrain

Two more primary sources were studied after v0.1 shipped, and their proven mechanisms folded in.

### From Karpathy's [autoresearch](https://github.com/karpathy/autoresearch) (the "Karpathy Loop") → experiment goals

For optimize-a-metric briefs, the goal skill now compiles `kind: experiment` specs that run a measure-and-ratchet loop instead of a task checklist:

- **Baseline as the first run, strict-improvement ratchet** — commit *before* measuring so every attempt has a hash; keep only if strictly better (equal counts as worse); `git reset` on regression. The branch is a monotone ratchet of validated wins.
- **`results.tsv` journal** (commit · metric · keep/discard/crash · description), untracked — every attempt including failures is recoverable via its commit hash even though the branch only keeps winners.
- **Immutable evaluator** — the measure command and its inputs are frozen at arm time; the verifier `git diff`s them against the baseline commit, and the gate hashes the rubric each turn, surfacing any change with a moved-goalpost warning. (autoresearch's `prepare.py`-is-read-only rule, enforced structurally.)
- **Simplicity tiebreaker, plateau breaker, crash budget, context hygiene** (output to log files, grep results back) — adapted nearly verbatim from `program.md`. Shopify's generalization validated the pattern beyond ML: one-shot "make it faster" prompts failed where the baseline-anchored metric loop succeeded.

### From Karpathy's [LLM-wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) and Garry Tan's gbrain → memory v2

- **Two-layer files** — compiled truth above a `---` (rewritten freely), append-only dated evidence log below (never edited). Compaction only ever touches the compiled layer; the truth stays re-derivable from evidence. This is also the accepted fix for the documented flaw of LLM-authored wikis: synthesis drifting into a "closed epistemic loop that cites itself."
- **Provenance grammar** — `[VERIFIED Sn · how · date]` / `[READ Sn · source]` / `[INFERRED Sn · confidence]` / `[USER-CORRECTION · date]`; compaction may never launder INFERRED into unqualified fact (gbrain's observed/self-described/inferred triple, adapted for code).
- **Corrections written immediately** — gbrain's "no batching, no deferring" rule; a user correction is the highest-confidence signal the system receives and would otherwise die with the session.
- **Resolver headers + fixed slots** — each memory file states what belongs in it and what doesn't (gbrain's MECE filing rule); MEMORY.md ships with `[no data yet]` slots (commands, invariants, gotchas, hot files) so distillation has a target shape.
- **Staleness gap analysis** — at session start, the newest evidence date is compared against repo activity; ≥20 commits of drift produces an explicit "re-verify before trusting" warning (gbrain's "nothing's been added about Alice since April 22" caveat, for code).

Deliberately not borrowed: autoresearch's never-stop-unbounded loop (our budgets are mandatory — the gate is not allowed to be infinite), gbrain's database/pgvector layer (plain markdown + grep is the right scale for a per-repo memory; gbrain itself says grep works at moderate scale), and entity/relationship graphs (wrong shape for code lessons).

## 7.5 Relationship to the Open Knowledge Format (OKF)

Google Cloud's [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf) (OKF v0.1, 2026) is convergent prior art for the same idea ultragoal's memory is built on — and it cites the same lineage we do (markdown-as-knowledge LLM wikis, Obsidian/Notion-style hierarchical markdown, "metadata as code"). Its thesis matches ours almost word for word: knowledge as *"a directory of markdown files with YAML frontmatter… no schema registry, no central authority, and no required tooling. If you can `cat` a file, you can read OKF; if you can `git clone` a repo, you can ship it."* That is precisely what `.ultragoal/` already is.

**Where we align with OKF** (so a reader who knows OKF recognizes the shape): version-controlled markdown that agents write and humans curate; an index for progressive disclosure (our `MEMORY.md` ≈ OKF's `index.md`); a dated, append-only update history (our below-the-line evidence log ≈ OKF's `log.md`, §7); cross-references by plain markdown links; external sources under citations. Goal specs carry OKF-style frontmatter with a required `type` (OKF §4.1) — they are valid OKF concept documents.

**Where we extend OKF** (the epistemics OKF v0.1 does not specify): per-claim **provenance** (`[VERIFIED]/[READ]/[INFERRED]/[USER-CORRECTION]`) and the **two-layer** compiled-truth-over-append-only-evidence split that stops a memory from citing its own guesses. OKF has `timestamp` and a `# Citations` convention but no confidence/provenance model — for a *lesson store* (as opposed to an asset catalog) that distinction is the whole point.

**Where we deliberately don't follow OKF** — and why this isn't a wholesale adoption: OKF's unit is **one-concept-per-file** (a table, a metric, a playbook — an asset *catalog*). ultragoal's memory is a small set of *aggregate* files (`facts.md`/`patterns.md`/`failures.md`) tuned for a compact index that is injected into every session. Exploding a per-repo lesson store into one file per claim would add structure we don't need and work against that injection model — that catalog shape fits assets, not lessons. So we treat OKF as a standard we **align with and extend**, not one we migrate into — conformance for its own sake isn't better than a shape fitted to the job. (Should a user ever want their `.ultragoal/` consumed by an OKF visualizer or catalog, the gap is small and additive: frontmatter on the memory files. We don't impose that cost by default.)

## 8. Roadmap

npx shim → community-marketplace submission → output styles shipping the readability/prose blocks → scheduled "dreaming" (cloud routine that runs the lint/compact pass overnight, mirroring both CMA's dreaming feature and gbrain's nightly consolidation crons) → scheduled discovery/triage (the loop that *finds* the work, not just finishes it: a cron automation reads CI failures, open issues, and recent commits, then writes candidate goal briefs into a queue for the user to ratify — runs that find nothing self-archive silently) → optional Outcomes/Managed-Agents bridge for hours-long cloud runs.
