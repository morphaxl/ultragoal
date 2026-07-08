# The ultragoal field guide — when to use what

One rule generates every recommendation here: **pick the smallest container that holds the work.** The ladder, smallest first:

```
ordinary chat  →  native /goal  →  ultragoal goal  →  program
(no ceremony)     (one condition)   (the full loop)    (chain of goals)
```

Climbing a rung costs tokens and ceremony; it buys persistence, verification, and memory. Most days you'll live on the bottom two rungs. That's correct.

## The decision table

| You have… | Use | Because |
|---|---|---|
| A question, a tweak, a one-file fix | **Ordinary chat** — no goal | Your 30-second review *is* the verification. Even right after a goal finished. |
| One checkable condition, one sitting, don't care about a record | **Native `/goal`** | `/goal all tests in test/auth pass` — lightest loop there is. Dies with the session; that's fine here. |
| Substantial build/fix/migration with a definable "done" | **`/ultragoal:goal <ramble>`** | Interview → rubric → gated loop → independent verifier → memory. The default rung for real work. |
| "Make this number better" | **Same command** — it becomes an *experiment goal* | Baseline first, one change per attempt, strict-improvement ratchet, frozen measure command. |
| Work you'll walk away from (overnight, weekend) | **`npx ultragoal run "<brief>"`** | Full autonomy from the terminal; add `--headless` for no UI — supervised, so a crashed/rate-limited/refused run resumes instead of dying. |
| The same job every week/night | **A `/schedule` routine or cron whose payload is `npx ultragoal run --headless`** | Exit code is trustworthy; memory makes run N cheaper than run 1. |
| A brief too big for one goal | **A program** — the skill proposes it | Chain of goals, verified checkpoint + fresh context at every cut. See [programs.md](programs.md). |
| Long mechanical execution, cost matters | **Economy dial** at arm time | Your model orchestrates and reviews; Sonnet executors implement. ~half the price, judgment intact. |
| Things you already shipped and want to *stay* true | **`npx ultragoal invariants`** on a schedule | Finished goals graduate their checks; violations wake you instead of rotting. |
| Doubt about a finished goal's claims | **`/ultragoal:verify`** | A fresh verifier re-runs every check and tries to refute the work. |

## Scenarios

### 1. "Fix this typo / why is this failing?" — don't use ultragoal

The skill will off-ramp this itself, but save the round-trip: small, reversible, reviewable-at-a-glance work is ordinary conversation. A goal here spends more on ceremony than on the work — the system's own definition of failure.

### 2. A real feature

```
/ultragoal:goal users keep asking for CSV export on the reports page, needs to
handle the 50k-row accounts without timing out, don't touch the PDF path
```

You'll get: a short interview on the forks that matter (where the export lives, what "handles 50k rows" means as a number), a draft spec with a command-checkable rubric, a recap, and three dials — **depth** (quick ~10 / standard 25 / deep 60+ turns), **rigor** (vanilla / standard / max), **execution** (frontier / economy). Accept the defaults unless you know better; the recommendations are calibrated from your repo's goal history. Say "Arm goal" and walk away — the gate holds the session until an independent verifier signs off and lessons are saved.

**Dial guidance:** vanilla rigor on a strong model is right ~90% of the time. Reach for *standard* when the domain has burned you before (the skill will suggest this itself if `stats.tsv` shows verifier failures there); reserve *max* (3-lens panel) for release-grade stakes or weaker models. Pick *economy* when the work is execution-heavy and mechanical; skip it when the implementation itself is the subtle part.

### 3. "Make it faster"

```
/ultragoal:goal the dashboard build takes 4 minutes, get it under 2 without
dropping any test coverage
```

Optimize-briefs compile to an experiment goal: baseline measured and committed first, then one change per attempt — keep on strict improvement, `git reset` on regression, every attempt journaled in `results.tsv` with its commit hash. The measure command is frozen at arm time; the verifier re-runs the final number itself and fails the goal if the measurement was ever touched. Nobody moves the goalpost, including the agent.

### 4. The overnight run

```
npx ultragoal run "migrate the API layer off v1 auth — all call sites, contract
tests stay green, staging smoke passes" 
```

Full autonomy (`--dangerously-skip-permissions`) is the default — the rubric, verifier, budget, and fail-open gate are the guardrails, not permission prompts. Prefer a repo you can reset, or add `--worktree` for an isolated checkout. Add `--headless` to run without a UI: the supervisor inspects the goal file after the process ends and resumes it through crashes, rate limits, and safety refusals — exit 0 means *verified done*, nothing less. Pick the **deep** tier when arming so the budget doesn't pause good work at 3am.

### 5. The recurring job that compounds

```
/schedule every Monday 9am: /ultragoal:goal bump dependencies — all tests green,
no major versions without reading the changelog
```

or in CI: a nightly job running `npx ultragoal run --headless "fix any test that failed in tonight's suite; never weaken an assertion"`. Two things the bare schedule+goal composition doesn't give you: an independent verifier on every completion (Anthropic's own Routines docs warn that a green run status is not task success), and enforced distillation — Monday's run starts from last Monday's lessons.

### 6. The big one — a program

```
/ultragoal:goal rebuild onboarding end to end: new auth flow, migrate the user
table, then the three signup screens, then docs — nothing ships until e2e passes
```

The skill recognizes program-sized briefs (would blow one goal's context, spans backend + UI + docs verification regimes, contains a risky migration) and proposes a **program map** instead of one bloated spec: the ordered goals, why each cut is where it is, which spans can safely overlap. One "Arm program" ratifies the chain; each link runs headless and fully verified; the manager replans the next brief from what the last goal actually found. Force it either way with "as one goal" / "as a program". Full protocol: [programs.md](programs.md).

### 7. After shipping — make it stay shipped

Finished goals graduate their durable checks into `.ultragoal/invariants/` automatically at release. Wire the tripwire once:

```
/schedule daily 7am: run `npx ultragoal invariants` and if it exits non-zero,
report each violated invariant with what merged since its last-pass date
```

A violation is detection, not repair — the report names the suspects and the fix goes through a new goal. Retire an invariant deliberately (`status: retired` in its file) when the feature it guards is gone; never delete it to silence it.

### 8. Trust, verify, hand off

- `/ultragoal:status` — rubric progress, turn budget, last verdict, memory health.
- `/ultragoal:verify` — re-audit any goal, active or archived, when a claim smells off.
- Mid-flight handoff: everything is git-committed markdown — a teammate pulls, the banner shows the active goal, the gate holds them to the same rubric.
- `/ultragoal:stop` — bail out; even abandoned goals distill what they learned.

## Mistakes we see (and the fix)

1. **Goaling trivia.** If you'd review the whole diff in 30 seconds, don't arm a loop. The off-ramp exists; trust it.
2. **Vague briefs on autopilot.** Headless runs can't interview you — they record defaults. Say the number ("p95 under 200ms"), the boundary ("don't touch billing"), and where done lives. [briefing-guide.md](briefing-guide.md) lists the high-value signals.
3. **Skimming the recap.** It's the last cheap moment to redirect. The one thing to actually read: *Key decisions* — that's where a wrong assumption surfaces before turn 15 instead of after.
4. **One monster goal instead of a program.** If the spec has three unrelated "phases," you're paying context degradation for no checkpoint. Let it be a program.
5. **Parallel because it feels faster.** Two goals sharing a lockfile, a migration, or a full-suite check will lie to each other's verifiers. Parallel is earned by provably disjoint blast radius; default is sequential.
6. **Treating a green run as done.** The exit code and the verifier verdict are the contract — read the final report's "diffs worth reading" list; verification proves the work passes, reading is how you keep understanding your codebase.

## Deeper docs

[programs.md](programs.md) · [briefing-guide.md](briefing-guide.md) · [codex.md](codex.md) · [loop-engineering.md](loop-engineering.md) (the why) · rubric library: `skills/goal/rubrics/INDEX.md`
