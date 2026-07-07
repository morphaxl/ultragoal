# Rubric design guide

"A well-designed rubric is doing more work than the model… Rubric design is the skill now, the model is the easy part." The loop only converges if the feedback in the environment is honest — the rubric *is* the environment.

## Principles

**The rubric is the user's acceptance test, written as observable behaviors** — the things *they* would check to believe it works, each verified at the layer the behavior actually lives in. Structure (it compiles, it's wired, the mocked tests are green) is necessary scaffolding, never the proof. Two consequences run through everything below: every acceptance criterion the user voiced must map to an item (and you should infer the ones they'd be upset to find broken but didn't say), and when a convenient structural proxy and the real behavior diverge, the item checks the behavior. A rubric full of green proxies while the feature doesn't actually do what the user wanted is the worst failure the loop has, because it reads as success.

1. **Every item checkable by a command, never vibes.** The check must be runnable in this repo, and its output must decide the item unambiguously.
   - Bad: "Database queries should be fast"
   - Good: "All checkout queries complete in <50ms — check: `psql "$DATABASE_URL" -f bench/queries.sql` (EXPLAIN ANALYZE per query) shows execution time < 50ms on every plan"
   - The check must exercise the **same layer the claim lives in**. A claim about runtime appearance or behavior ("the rail renders", "the list shows 10 cards", "the screen is visible") is satisfied only by a runtime observation — a screenshot, a rendered-size assertion, a request against the running app. `grep`, `tsc`, `eslint`, `next build`, and unit tests prove the code is *wired*; none of them prove it *renders*. A green static check on a behavioral claim is the loop's most dangerous false positive: it reads as "works" while nothing ever drew a pixel. The same trap one layer further out: a claim that crosses a **process or network boundary** — an external API, an auth handshake, a database, a third-party service — is proven only by a **real call that goes through**. Mocked unit tests prove your orchestration logic; they never prove the dependency accepts your request. Mock what you're sure of; live-test the seam you're *least* sure of (the strong instinct is to do the opposite — to mock the scary new boundary because it's hard to hit for real, which is exactly the one that breaks). And a self-disclosed "this won't actually run until X" — a missing secret, a stubbed call, "the device round will confirm" — is a *blocking* unchecked item, never a footnote on a goal that otherwise reads as done.
   - If no command can observe the behavior yet, the **first rubric item is building that check** — a script, a bench, a log line, a debug endpoint. Same rule experiments use for the measure command: construct the feedback signal, then push against it.
2. **Incremental order.** Sequence items so earlier ones are prerequisites for later ones (schema migrates → endpoint returns 200 → error paths covered → integration tests pass → load test holds). The loop should always have a next checkable step, not one all-or-nothing finish line.
3. **Measurable thresholds, not judgments.** "Elegant", "maintainable", "scales well" are not items. Cyclomatic complexity limits, line budgets, latency percentiles, exit codes, and file counts are.
4. **Outcomes, never approaches.** An item names the end state, not the route: "p95 under 200ms", never "add a Redis cache". The moment an item encodes a method, the loop optimizes for compliance instead of exploring for the result — and the biggest wins come from approaches the spec author didn't think of. If the user mandates an approach, record it as a Constraint; otherwise the route belongs to the worker. To write the outcome well, picture the user actually using the result and ask "what would they *do* to check it, and what would make them say 'that's not what I wanted'?" — those actions are your items. A brief that says "a Messages tab" or "lighting that sells the speed" is naming a behavior/feel, not a file; the item is the behavior, observed.
5. **Constraints are part of the rubric.** Anything that must NOT change goes in Constraints, and the verifier checks them: "no other test file modified — check: `git diff --stat main -- 'test/**'`".
6. **Stop conditions are mandatory.** Every rubric without one is an infinite-optimization bug. Default: the goal's turn budget (tracked by the gate), plus "same item fails verification 3 consecutive times".
7. **General solutions only.** Add this item to any coding goal where it could matter: solution works for all valid inputs, not just the test cases — no hard-coded values, no special-casing the checks.
8. **The verifier item is always last and never self-certified:**
   `- [ ] VERIFIER: independent sign-off recorded in the Verification log`

## Anti-patterns (reject your draft if any apply)

- Subjective criteria ("clean", "best practices", "polished")
- Unmeasurable goals ("noticeably faster", "more robust")
- Compound items bundling two claims that can pass and fail independently — split them
- Redundant items double-counting one property — merge them
- An acceptance criterion the user voiced with no rubric item covering it — every stated criterion maps to an item, plus the ones they'd be upset to find broken but didn't say
- Items that prescribe the approach ("uses X library", "implements the Y pattern") — outcomes only; a user-mandated approach goes in Constraints
- Missing stop conditions
- One giant item instead of an incremental sequence
- A check command that doesn't exist in this repo or can't run locally
- Items the worker can satisfy by editing the check instead of the work (pin the check: exact command, exact path, exact threshold)
- Count-checks that grep the goal file itself — they match the rubric's own text, evidence lines, and the verifier's appended tables, silently inflating the count. Scope them to their section with an awk range (`awk '/^# Section/,/^# Next/'`)
- A behavioral or visual claim verified only by a static proxy — "renders" / "visible" / "shows N" checked with `grep` / `tsc` / `eslint` / `build` / unit-test. Either give it a real runtime observation (screenshot, rendered-size assertion, request against the running app) or split it into a `[x]` "wired" item and a separate `[ ]` "renders visibly" item that stays unchecked until something actually observes it. Never let *wired* masquerade as *works* — that is exactly how an empty-but-correctly-coded component ships.
- A new user-facing destination with no check on *how the user reaches it*. "The screen renders" ≠ "the screen is reachable" ≠ "the entry point is where the user expects it." A new or moved screen needs an item asserting its **placement** — which navigator / tab / menu it lives in, in **every** layout variant the app ships (e.g. both a native and a JS tab bar) — not just that the route exists. A Messages screen reachable only by deep link, while the tab bar never shows it, passes "renders" and fails the user (see the wired/renders/**reachable** split below).
- A claim that crosses a process/network boundary verified only by **mocked tests**. Green mocks prove your orchestration, not that the real dependency accepts the call. It needs one **live smoke** — a real request that actually succeeds against the real (or staging) dependency, exercising the auth/headers/handshake end to end. The most novel, fragile seam in the work is the one you must live-test, not the one you mock.
- A **self-disclosed runtime gap left as a footnote** — "won't run until the secret is set", "mocked for now", "device round will confirm" — sitting under a goal that still reads as done. An honest "it doesn't actually run yet" must become an unchecked `[ ]` blocking item (or cap the verdict at partial); the gate must never let a disclosure pass as if it were resolved.
- A rubric that tests only the feature's happy path and its own edge cases, never how its **failure** interacts with the rest of the app. New endpoints need a failure-cascade item: on 4xx/5xx the client degrades gracefully — clear error, no global logout, no broken/blank state. The landmine is rarely the feature working; it's what the whole app does the first time the feature errors.

9. **Checks emit one decisive line.** Prefer commands whose output settles the item at a glance — an exit code, a single number, a PASS/FAIL. Wrap noisy commands (`cmd > /tmp/x.log 2>&1 && echo PASS || echo FAIL`): the gate feeds check context back into the loop every turn, and raw dumps poison it. A flawed or noisy signal gets faithfully optimized — the loop is only as honest as what the check prints.

## Mechanical pre-arm audit

When the `scripts/rubric-audit.mjs` helper is available, run it against the draft goal before asking the user to arm:

```bash
node <goal-skill-dir>/scripts/rubric-audit.mjs .ultragoal/goals/active/<slug>/goal.md
```

Resolve `<goal-skill-dir>` to the directory containing `skills/goal/SKILL.md`; in the ultragoal source checkout, `node scripts/rubric-audit.mjs <goal>` is the same audit. The helper is intentionally conservative. It blocks only the failures that most often create false completion: no exact check command or structured manual/agent-run protocol, placeholder commands, missing verifier or stop conditions, UI/runtime claims proved by static checks, mock-only external seams, and explicit runtime gaps. Warnings are not automatic failures; they are prompts to either strengthen the rubric or record the tradeoff in Context so the verifier can see it was deliberate.

Run the audit after every meaningful rubric edit. If it flags a blocker, revise the draft before the recap; an armed weak rubric becomes the environment the loop optimizes.

## Shape of a good item

```
- [ ] <claim stated as a fact about the end state> — check: `<exact command>` <expected result>
```

And once completed, the worker appends its evidence directly underneath:

```
- [x] <claim> — check: `<exact command>` <expected result>
  - evidence: `<command actually run>` -> <key output line> (turn N)
```

The verifier audits this ledger before re-running anything; a checked box with no evidence line is an automatic FAIL.

### The evidence ladder — wired vs. renders vs. reachable vs. live

Structural checks and behavioral claims live on different rungs. When the strongest check you can run sits below the rung the claim lives on, split the item rather than checking the whole thing off on the lower proxy:

```
- [x] CreatorsRail mounted and fed data — check: `grep -n CreatorsRail screen.tsx` + `tsc --noEmit` exits 0
- [ ] CreatorsRail renders its cards visibly (non-zero height) — check: simulator/Playwright screenshot of the screen, or assert the rail node's measured height > 0
- [ ] Messages is a visible bottom-tab item in EVERY tab-bar variant — check: enumerate the rendered nav config (or screenshot the bar) and assert the Messages tab is present in both the native and JS bars; the route existing is not the tab showing
- [ ] Creating a challenge succeeds against the REAL gateway — check: mint a real token and POST to the staging data-gateway; assert a 2xx + a persisted challenge id, NOT a mocked response. Forcing a 401 also shows the client surfaces a clear error and does NOT global-logout.
```

Each item stays `[ ]` until something confirms *its own* rung — *wired* (code references it), *renders* (a pixel is drawn), *reachable* (the entry point is where the user expects it), *live* (a real call across the boundary actually goes through, and fails safely when it doesn't). A manual device step counts as confirmation, but an agent-run smoke — a non-interactive screenshot, or a script that makes one real request (the UI/feature templates carry both) — catches the failure turns earlier and for free. The two rungs the loop silently skips are the expensive ones: *reachable* ships a screen nobody can find, and *live* ships an integration that compiles, passes every mock, and 401s the instant a real user touches it. Climb to the highest rung the claim makes a promise about.

## Worked example (performance goal)

This example passes the mechanical audit — a guide example that fails its own linter teaches rubrics the loop then rejects.

```
# Rubric
- [ ] Baseline captured: current p95 recorded in bench/BASELINE.md — check: `grep -E '[0-9]+(\.[0-9]+)? ?ms' bench/BASELINE.md` prints the recorded p95
- [ ] All existing tests still pass — check: `pnpm test` exits 0
- [ ] p95 latency for /api/checkout under 200ms at 100 concurrent — check: `node bench/checkout.js` report line "p95" shows < 200ms against the running staging server (a real request, not a mock)
- [ ] Checkout failure degrades safely — check: `node bench/checkout.js --force-status 500` shows a clear client error and no cascade (no logout, no blank state)
- [ ] Failed approaches documented in the Decision journal — check: `awk '/^# Decision journal/,0' goal.md | grep -ci 'abandoned\|dead end'` prints ≥ 1
- [ ] VERIFIER: independent sign-off recorded in the Verification log

# Stop conditions
- 25 turns reached, or p95 item fails verification 3 consecutive times, or any approach requires changing the public API

# Constraints
- No public API shape changed — check: `pnpm test:contract` exits 0
```
