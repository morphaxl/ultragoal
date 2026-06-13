# Dead ends

<!-- resolver: things TRIED THAT FAILED — what was attempted, why it failed, what to do
     instead. Consult before re-attempting anything ambitious.
     NOT here: working approaches (patterns.md), repo facts (facts.md).
     Same two layers: compiled above the ---, dated evidence below. -->

## Current understanding

- Research-memo failure mode = confident hallucination about an unfamiliar codebase, and it shows up TWO ways: (1) **proving a negative without searching where the answer lives** — claimed "omp has no goal loop" after grepping docs/+hooks+swarm but never opening `src/goals/`, where it actually lives; (2) **importing a false premise from the brief with a fabricated citation** — the brief said "omp's own 'dynamic workflows' wording," I repeated it cited `[README]`, but that phrase appears 0× in omp. Fixes: for a negative, enumerate the dirs where the feature WOULD live and open them before writing "none"; for any claim that originated in the brief/prompt rather than your own reading, re-confirm it against source before it gets a citation — the brief is not a source. Both were caught only by the independent verifier re-fetching source, not by self-review. [VERIFIED S10 · omp memo, 2 FAILs · 2026-06-13]

---

## Evidence log
[2026-06-13 S10] omp-ultragoal-feasibility goal: verifier FAIL#1 (no-goal-loop, missed src/goals/) → rewrote; FAIL#2 (false "dynamic workflows"→README attribution, 0 occurrences in omp) → fixed attribution + tightened docs-not-opened citations → PASS rubric=420374841. Net finding: omp HAS a goal mode (self-verified, token-budgeted); ultragoal's real gap to fill is the independent grader + checkable rubric + tamper-evidence; port binds to a tool_call hook on `goal complete`.
