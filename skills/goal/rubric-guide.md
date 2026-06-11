# Rubric design guide

"A well-designed rubric is doing more work than the model… Rubric design is the skill now, the model is the easy part." The loop only converges if the feedback in the environment is honest — the rubric *is* the environment.

## Principles

1. **Every item checkable by a command, never vibes.** The check must be runnable in this repo, and its output must decide the item unambiguously.
   - Bad: "Database queries should be fast"
   - Good: "All checkout queries complete in <50ms — check: `EXPLAIN ANALYZE` output for each query in `bench/queries.sql`"
   - If no command can observe the behavior yet, the **first rubric item is building that check** — a script, a bench, a log line, a debug endpoint. Same rule experiments use for the measure command: construct the feedback signal, then push against it.
2. **Incremental order.** Sequence items so earlier ones are prerequisites for later ones (schema migrates → endpoint returns 200 → error paths covered → integration tests pass → load test holds). The loop should always have a next checkable step, not one all-or-nothing finish line.
3. **Measurable thresholds, not judgments.** "Elegant", "maintainable", "scales well" are not items. Cyclomatic complexity limits, line budgets, latency percentiles, exit codes, and file counts are.
4. **Outcomes, never approaches.** An item names the end state, not the route: "p95 under 200ms", never "add a Redis cache". The moment an item encodes a method, the loop optimizes for compliance instead of exploring for the result — and the biggest wins come from approaches the spec author didn't think of. If the user mandates an approach, record it as a Constraint; otherwise the route belongs to the worker.
5. **Constraints are part of the rubric.** Anything that must NOT change goes in Constraints, and the verifier checks them: "no other test file modified — check: `git diff --stat main -- 'test/**'`".
6. **Stop conditions are mandatory.** Every rubric without one is an infinite-optimization bug. Default: the turn budget, plus "same item fails verification 3 consecutive times".
7. **General solutions only.** Add this item to any coding goal where it could matter: solution works for all valid inputs, not just the test cases — no hard-coded values, no special-casing the checks.
8. **The verifier item is always last and never self-certified:**
   `- [ ] VERIFIER: independent sign-off recorded in the Verification log`

## Anti-patterns (reject your draft if any apply)

- Subjective criteria ("clean", "best practices", "polished")
- Unmeasurable goals ("noticeably faster", "more robust")
- Items that prescribe the approach ("uses X library", "implements the Y pattern") — outcomes only; a user-mandated approach goes in Constraints
- Missing stop conditions
- One giant item instead of an incremental sequence
- A check command that doesn't exist in this repo or can't run locally
- Items the worker can satisfy by editing the check instead of the work (pin the check: exact command, exact path, exact threshold)

9. **Checks emit one decisive line.** Prefer commands whose output settles the item at a glance — an exit code, a single number, a PASS/FAIL. Wrap noisy commands (`cmd > /tmp/x.log 2>&1 && echo PASS || echo FAIL`): the gate feeds check context back into the loop every turn, and raw dumps poison it. A flawed or noisy signal gets faithfully optimized — the loop is only as honest as what the check prints.

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

## Worked example (performance goal)

```
# Rubric
- [ ] Baseline captured: current p95 recorded in bench/BASELINE.md — check: file exists and has a number with units
- [ ] All existing tests still pass — check: `pnpm test` exits 0
- [ ] p95 latency for /api/checkout under 200ms at 100 concurrent — check: `node bench/checkout.js` report line "p95"
- [ ] No public API shape changed — check: `pnpm test:contract` exits 0
- [ ] Failed approaches documented in the Decision journal (at least one line per abandoned attempt)
- [ ] VERIFIER: independent sign-off recorded in the Verification log

# Stop conditions
- 25 turns reached, or p95 item fails verification 3 consecutive times, or any approach requires changing the public API
```
