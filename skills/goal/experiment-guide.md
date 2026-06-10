# Experiment goals — the ratchet loop

For goals whose objective is **moving a number** (latency, build time, bundle size, test runtime, memory, score, cost), don't write a task checklist — run an experiment ratchet. The protocol below is adapted from Karpathy's autoresearch loop, which has been validated on ML training, CI pipelines, and build optimization: hundreds of unattended experiments, every attempt journaled, only validated wins kept.

## When to choose `kind: experiment`

The brief asks to optimize, speed up, shrink, or improve a quantity — and a single command can measure it. If success is "feature exists and works," use a normal task goal instead. If you can't measure it with a command, you can't run experiments on it; say so and propose making it measurable first.

## The contract

Three things are fixed at arm time and **immutable for the life of the goal**:

1. **The measure command** — one command that prints the metric (e.g. `node bench/checkout.js`, `hyperfine 'pnpm build'`, `wc -c dist/*.js`). If no reliable measure exists, the goal's first phase is to build one — and from then on it's frozen.
2. **The budget** — a fixed per-run budget where it applies (same dataset, same duration, same machine), so results are comparable across experiments.
3. **What may be edited** — name the files in scope. The measure command, its data, and anything it depends on are out of scope. Never modify the evaluation to improve the number.

## The loop

```
0. BASELINE: run the measure command on untouched code. Record it as row 1. No exceptions.
LOOP until target met or experiment budget exhausted:
1. Pick ONE idea. State it in a sentence.
2. Implement it. git commit (commit BEFORE measuring, so the attempt has a hash).
3. Run the measure command, output redirected to a log file — never let raw output flood
   the context. Read the result back with grep/tail.
4. Strictly better than best-so-far → KEEP: the commit stands, this is the new best.
   Equal or worse → DISCARD: git reset --hard to the previous best.
   Crash → try a quick fix at most twice; then log status "crash" and move on.
5. Append a row to results.tsv either way.
```

`results.tsv` lives next to the goal file (in the goal's `.ultragoal/goals/active/<slug>/` directory), tab-separated:

```
commit	metric	status	description
a1b2c3d	412ms	keep	baseline
b2c3d4e	371ms	keep	memoize inventory lookup
c3d4e5f	398ms	discard	batch the price queries (slower — N+1 was elsewhere)
d4e5f6g	0	crash	parallel checkout workers (deadlock)
```

Every attempt — especially the failures — gets a row. Discards are data: the journal plus git hashes means any abandoned idea can be revisited with its full diff.

## Judgment rules

- **Strict improvement only.** Equal counts as worse. The branch is a ratchet of validated wins.
- **Simplicity tiebreaker.** A tiny gain that adds ugly complexity is not worth keeping. An equal result from *deleting* code is a keep. When in doubt, prefer the simpler tree.
- **One variable at a time.** If you changed two things and it improved, you don't know which one worked.
- **Noise check.** Before trusting a small win, re-run the measure once; if the gain is within run-to-run variance, it's a discard. Note typical variance in the goal file after the baseline.
- **Plateau breaker.** After 4–5 consecutive discards, stop tuning the current approach: re-read the code for unexplored angles, combine earlier near-misses, or attempt a structural change. Variations on a dead idea waste the budget.
- **Don't stop to ask.** Within the experiment budget you are autonomous. Out of ideas means think harder, not check in.

## Rubric shape for an experiment goal

```markdown
# Rubric
- [ ] Baseline recorded as the first row of results.tsv, with run-to-run variance noted
- [ ] <metric> improved from baseline by ≥ <target> per the measure command — check: `<measure command>`
- [ ] Every experiment logged in results.tsv with a commit hash, including discards and crashes
- [ ] All existing tests still pass — check: `<test command>` exits 0
- [ ] The measure command and its inputs are unmodified — check: `git diff <baseline-commit> -- <measure paths>` is empty
- [ ] VERIFIER: independent sign-off recorded in the Verification log

# Stop conditions
- <N> experiments run (count rows in results.tsv), or target met, or 5 consecutive
  discards after a plateau-break attempt
```

The verifier's extra duties on experiment goals: re-run the measure command itself, confirm the final number, spot-check that results.tsv rows correspond to real commits, and `git diff` the measure paths against the baseline commit.
