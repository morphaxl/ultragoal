# Programs — chains of goals, divided by context

A **program** is what the goal skill proposes when a brief is bigger than one goal should hold: an ordered chain of goals run one at a time, each headless and fully verified, with a thinking checkpoint between links. It is deliberately NOT dynamic-workflow fan-out — no scripted parallelism, no agent swarm. It is a judgment chain: mostly sequential, smarter about where to cut.

## Why cut at all — goals as context boundaries

A single session degrades as context fills: compaction loses nuance, early decisions blur, the model drifts from the spec. Each cut in a program buys a **verified checkpoint** plus a **fresh context** that rebuilds from exactly three clean sources: the next goal's brief, the memory distilled by prior goals, and the actual repo state. Distill-then-reload beats remembering. The headless supervisor makes each link trustworthy — `npx ultragoal run --headless` exits 0 only when the goal file proves independently verified done, so the manager never advances past an unverified checkpoint.

## Where to cut (division heuristics)

Cut the program where:
- one goal would blow past the deep tier or degrade its own context;
- the **verification regime changes** — backend contract work, UI, and docs want different rubrics and different evidence rungs;
- a **risky unknown** deserves its own small spike goal whose *findings* rewrite the next brief;
- fresh eyes beat continuity (post-migration cleanup, pre-ship polish).

## Parallelism is earned, never default

A goal may leave the sequential spine only when its **blast radius** is provably disjoint from every concurrently-running goal's. Blast radius is more than files:
- **Write set** — the files it will touch (estimate from the brief + consult scan);
- **Shared runtime state** — lockfiles/installs, DB migrations, dev-server ports, env files, generated artifacts;
- **Verification cross-talk** — full-suite runs, `git diff`-based constraints, and commits all observe the whole tree; a second goal's in-progress edits make the first goal's honest checks lie.

Rules: anything touching lockfiles, migrations, shared config, or codegen stays on the spine regardless of file lists. Uncertainty = sequential. Parallel spans run in **worktrees** the manager creates itself (`git worktree add ../wt-<slug> -b goal/<slug>`, then `cd` in and run `npx ultragoal run --headless "<brief>"` — creating the worktree manually keeps the resume supervisor working; the `--worktree` flag goes single-shot). A join that conflicts means the overlap judgment was wrong — treat it as a finding, not an annoyance. After a join, reconcile memory (evidence logs append cleanly; run a compaction pass if the compiled layer conflicts). Practical width: 2–3 concurrent headless sessions.

## The manager

One session manages the program, and it does only what judgment requires — it reads reports and goal files, never the work:

1. **Program interview, once.** Headless goals can't ask questions, so the human interview moves up a level: interview the user about the *program*, then compile per-goal briefs complete enough that recorded defaults are safe.
2. **Program map recap + standalone "Arm program".** Ordered goals, one line each (deliverable, verification, depth tier), cut rationale, any parallel spans with their blast-radius justification, total scale in turns. One ratification for the whole program.
3. **Execute the spine**: `npx ultragoal run --headless "<brief K>"` in the main checkout (background; the exit code is the contract). Parallel spans per the worktree rules above.
4. **Replan at every checkpoint.** After goal K, read its archived goal file — decision journal, failures, verdict — and *rewrite* goal K+1's brief accordingly. This is where a manager beats a static chain.
5. **Come back to the user** only on the same rule goals use: a genuine scope change, or input only they can provide.

**The manager runs under its own goal.** Its rubric: one item per link ("goal K verified done — check: runner exit 0 + `grep '^ULTRAGOAL-VERIFIED: PASS' .ultragoal/goals/archive/<slug>.md`"), one item per join ("merged, suite green"), a final whole-program check, and the VERIFIER item — so the gate holds the manager accountable and a fresh verifier signs the program, not just its parts.

## UX

Same front door — `/ultragoal:goal <ramble>` or `npx ultragoal run "<brief>"`. The skill sizes the brief: contained → off-ramp; goal-sized → today's flow (the overwhelming default); program-sized → the program map. Forcing words work both ways: "as one goal" / "as a program". Fully-headless program launching stays conservative: `--headless` runs as a single goal unless the brief explicitly says "as a program".
