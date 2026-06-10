# ultragoal

**Tell Claude what you want once. It works until the job is verifiably done — and it gets smarter every time.**

You talk to it like a person — a messy, unedited voice note is fine. It asks the few questions it can't answer itself, agrees with you on what "done" means, then works on its own: turn after turn, session after session, until an independent reviewer confirms the work holds up. Then it writes down what it learned, so the next goal starts smarter.

Underneath, this is the workflow Anthropic's engineers describe using with Fable 5: don't steer the model prompt by prompt — **design a loop where it self-corrects against honest feedback and manages its own memory.** ultragoal packages that whole system into a plugin you install with one command.

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
- **Fresh eyes, not self-review.** A separate verifier agent — with no knowledge of how the work was done — re-runs every check and tries to prove the work *wrong*. Anthropic's guidance is blunt: fresh-context verifiers outperform self-critique. Only their sign-off counts.
- **A loop that can't quit early.** A gate blocks Claude from stopping while the goal is unfinished — and because the goal lives in a file, it survives `/clear`, restarts, and days away. Same architecture as Claude Code's built-in `/goal`, with upgrades (see [how the loop works](#how-the-loop-actually-works)).
- **Memory that compounds.** Every goal ends by saving verified facts, working patterns, and dead ends into your repo. The continual-learning progression — fail → investigate → verify → distill → consult — runs on autopilot, for your whole team.

And the pitch in one line: **you never have to learn prompt engineering.** You bring intent; ultragoal writes the expert-grade brief for itself, straight from Anthropic's playbook.

## Install

```bash
npx ultragoal
```

That's it. (It wraps Claude Code's native plugin system — nothing is scaffolded into your repo until you use it.) Prefer the native route? Inside Claude Code:

```text
/plugin marketplace add morphaxl/ultragoal
/plugin install ultragoal@ultragoal
```

For a team, install to project scope so the config lands in `.claude/settings.json` and teammates get prompted automatically:

```bash
npx ultragoal --project
```

Requires Claude Code ≥ 2.1.139. Uninstall anytime with `npx ultragoal uninstall`.

## Sixty seconds to your first goal

```text
/ultragoal:goal okay so the checkout flow is slow and users are bouncing, I think it's
the inventory check, we talked about caching it last week, anyway it needs to be under
200ms and definitely don't break the contract tests, oh and there's that weird race
condition ticket too maybe related...
```

That's a real, unedited ramble — exactly what it's built for. Ultragoal will:

1. **Consult** project memory and scan your repo with parallel subagents before asking you anything.
2. **Interview** you — only the 2–5 questions it genuinely can't answer itself, batched, with recommended defaults.
3. **Spec** the goal: objective with the *why*, a rubric where every item has an exact check command, stop conditions, and constraints — then adversarially reviews its own rubric before showing you.
4. **Arm the loop** on your yes. From here a Stop-hook gate blocks the end of every turn and feeds the remaining rubric back, so Claude keeps working without you prompting each step.
5. **Verify** with a separate fresh-context subagent that re-runs every check itself and tries to *refute* the claims — because models grade their own work generously, and independent verifiers don't.
6. **Distill** before it's allowed to finish: verified lessons, working patterns, and dead ends are written to `.ultragoal/memory/`, so the next goal starts smarter.

Walk away mid-goal, close the laptop, `/clear` — the goal survives. Next session opens with a banner: *"Active goal 'checkout-latency' — turn 9 of 25."*

## Two kinds of goals

**Task goals** — "build this, fix this, migrate this." Done means the checklist holds.

**Experiment goals** — "make this number better." When the brief is an optimization (build time, latency, bundle size, test runtime), ultragoal compiles it into a measure-and-ratchet loop modeled on Karpathy's [autoresearch](https://github.com/karpathy/autoresearch): establish the baseline first, then one change per experiment — commit, measure with an immutable command, keep only if the number strictly improved, `git reset` if it didn't. Every attempt lands in `results.tsv` (keeps, discards, *and* crashes), and since each row carries its commit hash, any discarded idea's full diff stays recoverable. The verifier re-runs the final measurement itself and fails the goal if the measure command was ever touched — no moving goalposts. The same pattern took Shopify from "one-shot 'make it faster' prompts fail" to a 65% faster build, unattended.

## Commands

| Command | What it does |
|---|---|
| `/ultragoal:goal <brain dump>` | The front door: interview → spec → armed loop → execution |
| `/ultragoal:status` | Dashboard: rubric progress, turn budget, last verdict, memory health |
| `/ultragoal:stop` | Bail out gracefully — pause or abandon, gate releases instantly |
| `/ultragoal:remember` | Distill lessons from the current session into memory |
| `/ultragoal:compact` | Memory hygiene pass — merge, generalize, drop stale (nudged every ~10 sessions) |
| `/ultragoal:setup` | First-run init / change preference knobs (runs automatically on first goal) |

## What it creates in your repo

Everything the plugin produces is plain markdown you own — editable, diffable, git-shareable. The engine ships in the plugin; the state lives with you.

```
.ultragoal/
├── config.md            # your knobs — hand-editable
├── goals/
│   ├── active.md        # the live goal spec: rubric, verification log, decision journal
│   └── archive/         # finished and abandoned goals (their journals feed memory)
└── memory/
    ├── MEMORY.md        # index + fixed slots (commands, invariants, gotchas, hot files)
    ├── facts.md         # what's true of this repo
    ├── patterns.md      # approaches that worked, and why
    └── failures.md      # dead ends, so no future session repeats them
```

Memory files are two-layered, borrowing the structure of [Karpathy's LLM-wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) and Garry Tan's gbrain: **compiled truth above the line** — rewritten as understanding improves — and an **append-only, dated evidence log below it** that is never edited. Every claim carries its provenance — `[VERIFIED · ran the command]`, `[READ · from docs]`, `[INFERRED]`, `[USER-CORRECTION]` — so confident prose can never quietly masquerade as checked fact, and the compaction pass cleans the synthesis without ever touching the evidence. When the repo has moved a lot since memory was last fed, the session banner says so and tells Claude to re-verify before trusting.

Plus a small fenced block in `CLAUDE.md` (shown to you before it's written) wiring the memory protocol and your chosen style knobs.

Memory is **git-committed by default**: it's your team's growing brain — every teammate's Claude consults and feeds the same one. Choose local-only at setup if you prefer.

## The knobs

Four questions at first run, stored in `.ultragoal/config.md`, each backed verbatim by Anthropic's official prompting guidance:

| Knob | Options (default first) |
|---|---|
| Action mode | proactive · conservative |
| Communication | lead-with-outcome · detailed |
| Scope discipline | minimal · elaborate-ok |
| Memory sharing | git-committed · local-only |

Change them anytime with `/ultragoal:setup` or by editing the markdown.

## How the loop actually works

`/goal` in Claude Code is a Stop hook under the hood: something checks a condition after every turn and blocks the stop until it holds. Ultragoal ships that same architecture with four differences:

- **The model can arm it.** Claude can't invoke built-in `/goal` itself; it *can* write a goal file, which is all the ultragoal gate needs. One skill takes you from ramble to running loop.
- **It persists.** Native `/goal` dies with the session. The ultragoal gate reads a file, so a goal spans sessions and days.
- **The judge runs commands.** Native `/goal`'s evaluator only reads the transcript — the self-report channel. Ultragoal's gate is deterministic (free, instant), and completion requires a fresh-context verifier that re-ran the checks itself.
- **Finishing requires learning.** The gate won't release until lessons are distilled to memory. Failed goals distill too — `failures.md` exists so the next attempt doesn't repeat them.

Every goal spec also includes a one-line **native `/goal` fallback**, handy for one-off headless runs: `claude -p "/goal ..."`.

### Escape hatches

Loops need brakes. Every rubric must carry stop conditions; every goal has a turn budget (default 25) — at the limit the gate demands an honest status report and releases; `/ultragoal:stop` releases it instantly; and the gate **fails open** on any script error. It cannot trap a session.

### Footprint

Always-on context cost is a handful of skill descriptions — on the order of a hundred tokens. Everything else loads when invoked. When no goal is active, the gate is a single file-existence check.

## Where this comes from

- Lance Martin (Anthropic), [*Designing loops with Fable 5*](https://x.com/RLanceMartin/article/2064397389189071163) — loops over prompts; rubric design as the skill; verifier subagents over self-critique; the fail → investigate → verify → distill → consult progression this plugin mechanizes.
- Anthropic, [*Prompting Claude Fable 5*](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5) — the verbatim behavior blocks behind the knobs, the memory protocol, and the verification guidance.
- Anthropic, [*Prompting best practices*](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) and the [Claude Code docs](https://code.claude.com/docs) on `/goal`, hooks, skills, and sub-agents.
- Andrej Karpathy, [autoresearch](https://github.com/karpathy/autoresearch) — the experiment ratchet behind experiment goals: baseline-first, strict improvement, keep/revert via git, every attempt journaled, the evaluator immutable.
- Karpathy's [LLM-wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) and Garry Tan's gbrain — the memory architecture: compiled truth over append-only evidence, per-claim provenance, lint-style maintenance.

Design rationale, trade-offs, and the competitive landscape live in [DESIGN.md](DESIGN.md).

## FAQ

**Do I need to know how to prompt?** No — that's the point. You bring what only you know (what you want, who it's for, what must not break); ultragoal writes the expert-grade brief for itself. You review a plan in plain English, never author a prompt.

**Versus ralph-loop?** Ralph re-feeds the same prompt until a promise appears. Ultragoal adds the parts the article argues matter: a rubric with per-item check commands, an independent verifier, persistent cross-session goals, and enforced distillation into memory.

**Does it spend a lot of tokens?** The gate itself is free (no model call). The loop spends what the work needs — that's the point of goal-directed runs. Budgets cap the blast radius; start small (10–15 turns) to calibrate.

**Can I run it unattended?** Yes — pair with auto mode (per-tool prompts) the same way the official `/goal` docs recommend, or use the native-fallback line headlessly.

**Uninstall?** `claude plugin uninstall ultragoal@ultragoal`. Your `.ultragoal/` state stays — it's yours.

## License

MIT
