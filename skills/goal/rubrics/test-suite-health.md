# Test-suite health

Use when: improving a test suite — coverage, flakiness, speed, or whether tests actually assert anything.
Kind: task (speed-only work → use build-ci-speedup as an experiment instead)

## Skills to pair
Testing skills for the project's framework, if present. Find more via `find-skills` on skills.sh.

## Rubric
- [ ] Coverage at an evidence-backed level — Google's published guidance: 60% acceptable, 75% commendable, 90% exemplary; pick the tier and enforce it — check: `npx jest --coverage --coverageThreshold='{"global":{"lines":75}}'` (or `coverage report --fail-under=75`). Do not cargo-cult 100%
- [ ] No flaky tests: suite green 10 consecutive runs (Google's data: ~1.5% flake rate is already a drag; 84% of pass→fail transitions are flakes) — check: `for i in $(seq 10); do <test cmd> || echo FAIL; done` shows zero FAIL
- [ ] Order-independent: passes shuffled and serial-vs-parallel — check: `pytest -p randomly` / Vitest `sequence.shuffle: true` / `npx jest --runInBand` all green
- [ ] Speed within budget — Bazel tiers as reference: unit ≤60s, medium ≤300s per target — check: `time <test cmd>`; slowest listed via `pytest --durations=10`
- [ ] Tests actually assert: mutation score ≥60 (≥80 good — Stryker thresholds) — check: `npx stryker run` with `thresholds: { high: 80, low: 60, break: 50 }` / `mutmut run && mutmut results`
- [ ] No permanent retry masking — check: `grep -rn 'retry' vitest.config.* jest.config.*` shows no nonzero global retry without a quarantine note
- [ ] VERIFIER: independent sign-off recorded in the Verification log

## Stop conditions
- Budget reached, or mutation testing reveals architectural test gaps too large for this goal (record findings, propose a follow-up goal)

## Constraints
- Never delete a failing test to improve the numbers — check: `git diff --stat main -- '**/*.test.*'` reviewed for deletions with justification

## Sources
- https://testing.googleblog.com/2020/08/code-coverage-best-practices.html
- https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html
- https://stryker-mutator.io/docs/stryker-js/configuration/
