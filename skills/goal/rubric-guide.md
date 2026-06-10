# Rubric design guide

"A well-designed rubric is doing more work than the model… Rubric design is the skill now, the model is the easy part." The loop only converges if the feedback in the environment is honest — the rubric *is* the environment.

## Principles

1. **Every item checkable by a command, never vibes.** The check must be runnable in this repo, and its output must decide the item unambiguously.
   - Bad: "Database queries should be fast"
   - Good: "All checkout queries complete in <50ms — check: `EXPLAIN ANALYZE` output for each query in `bench/queries.sql`"
2. **Incremental order.** Sequence items so earlier ones are prerequisites for later ones (schema migrates → endpoint returns 200 → error paths covered → integration tests pass → load test holds). The loop should always have a next checkable step, not one all-or-nothing finish line.
3. **Measurable thresholds, not judgments.** "Elegant", "maintainable", "scales well" are not items. Cyclomatic complexity limits, line budgets, latency percentiles, exit codes, and file counts are.
4. **Constraints are part of the rubric.** Anything that must NOT change goes in Constraints, and the verifier checks them: "no other test file modified — check: `git diff --stat main -- 'test/**'`".
5. **Stop conditions are mandatory.** Every rubric without one is an infinite-optimization bug. Default: the turn budget, plus "same item fails verification 3 consecutive times".
6. **General solutions only.** Add this item to any coding goal where it could matter: solution works for all valid inputs, not just the test cases — no hard-coded values, no special-casing the checks.
7. **The verifier item is always last and never self-certified:**
   `- [ ] VERIFIER: independent sign-off recorded in the Verification log`

## Anti-patterns (reject your draft if any apply)

- Subjective criteria ("clean", "best practices", "polished")
- Unmeasurable goals ("noticeably faster", "more robust")
- Missing stop conditions
- One giant item instead of an incremental sequence
- A check command that doesn't exist in this repo or can't run locally
- Items the worker can satisfy by editing the check instead of the work (pin the check: exact command, exact path, exact threshold)

## Shape of a good item

```
- [ ] <claim stated as a fact about the end state> — check: `<exact command>` <expected result>
```

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
