---
slug: cost-ratchet
status: abandoned
kind: experiment
budget: 35
session: dac81d85-0391-4177-b6ec-c935b38ff5e4
verify: on
created: 2026-06-11
---

# Objective
Cut the token cost of an ultragoal goal-run by ≥50% at zero quality loss. The bench exposed a ~10× fixed overhead over vanilla Claude Code on small tasks (1.20–1.64M vs 131–157k tokens, identical solve rates): mostly loop ceremony — scaffolding, spec ritual, verifier passes, gate re-feeding. Owner's product rule: multi-fold spend must buy measured delta; where it doesn't, the harness gets cheaper, not defended. This ratchet makes the harness right-size itself.

# Context
- Owner ratified: metric = mean ultragoal-arm tokens over the 3 bench tasks (1 rep each, 3 agent runs per measurement); hard guard = every run fully solves; target ≥50% reduction; budget 35; replaced harness-bench mid-baseline to start this (its salvage: instrument complete at commit 8572d47, 5 baseline rows incl. ultragoal 1,201,655 and 1,644,619 tokens). Owner then tightened the intensity: max 4 measured iterations and stop immediately on the first keep that meets the target — spend ceiling ≈ 15M bench tokens instead of 30M.
- My call — second guard prong, loop integrity: each measured sandbox must still contain a goal with a rubric and a hash-bound `ULTRAGOAL-VERIFIED: PASS`; otherwise deleting verification collapses the harness into vanilla and "wins" the metric. The frozen measure reports `solved=k/3 loop=k/3`; a keep requires 3/3 on both.
- Token-metric variance is near-deterministic: identical csv-stats ultragoal runs measured 1,208,646 (smoke) vs 1,201,655 (baseline r1) — ~0.6%. One rep per task is sound for tokens; it would NOT be for pass rates.
- Levers by conviction: (1) adaptive lean mode in the goal skill for small/clear briefs — minimal spec, no scouts, end-only verification cadence; (2) cheaper-tier verifier for mechanical checks (agents/verifier.md model field or dispatch guidance); (3) setup-scaffold trim for non-interactive first-runs; (4) gate stderr message diet (it re-feeds every turn); (5) goal-template/spec prose diet. One lever per experiment.
- Editable surface: skills/, agents/, hooks/, scripts/, installer templates — the harness. Changes must be ADAPTIVE right-sizing (small tasks get less ceremony; big goals keep the full kit), never blanket deletion of guarantees.
- Machinery: direct edits; measurements as background Bash with completion monitors; pause-while-measuring (set status: paused during long background measures, resume on monitor event — learned in harness-bench to stop gate-turn burn); verifier dispatched on kept claims.
- Commit discipline: commit BEFORE measuring (ratchet needs the hash); local commits only, no version bump/tag/push; owner commit style (no assistant attribution).

# Rubric
- [ ] Measure command exists and is frozen: `node bench/run.mjs --measure` runs the ultragoal arm on all 3 tasks (1 rep), prints one line `MEASURE mean_tokens=<N> solved=<k>/3 loop=<k>/3`, where loop counts sandboxes whose goal carries a hash-bound verified PASS — check: command completes end-to-end; freeze commit recorded below; `git diff <freeze-commit> -- bench` empty thereafter
- [ ] Baseline recorded: first results.tsv row is the untouched-code measurement with status keep and the variance note — check: `head -2 .ultragoal/goals/active/cost-ratchet/results.tsv`
- [ ] mean_tokens reduced ≥50% from baseline with solved=3/3 and loop=3/3 — check: best keep row ≤ 0.5 × baseline mean_tokens
- [ ] Every experiment logged in results.tsv with a real commit hash, including discards and crashes — check: row count ≥ measured iterations; `git cat-file -t <hash>` per row
- [ ] Engine healthy at final state — check: `bash tests/gate-test.sh` exits 0 with ≥47 passed; `claude plugin validate .` passes; `node --check installer/cli.mjs` exits 0; any goal-gate.sh/session-context.sh change carries ≥1 new test case
- [ ] Kept changes are adaptive right-sizing, not guarantee deletion — verifier reads every kept diff: fail-open intact; rubric/gate/verifier still present in the flow for standard goals
- [ ] VERIFIER: independent sign-off recorded in the Verification log

# Stop conditions
- 35 turns, or 4 measured iterations, or the target is met (first keep at ≤50% of baseline mean_tokens — stop immediately, no gold-plating), or 3 consecutive discards, or measure infrastructure broken across 3 consecutive fix attempts

# Constraints
- The measure is immutable once frozen: bench/run.mjs, bench/tasks/**, graders, and the metric definition — check: `git diff <freeze-commit> -- bench` empty
- Quality guards are non-negotiable: solved=3/3 AND loop=3/3 on every keep; a token win failing either is a discard
- No version bump, tag, or push; local commits only
- Product remains whole for large goals: every cut must be conditional on task scale or role, verifier-checked per diff

# Measure
- command: `node bench/run.mjs --measure`   (infra flags --parallel/--timeout-min allowed; metric unaffected)
- frozen at commit: 43815b1 — `git diff 43815b1 -- bench` must stay empty
- baseline: (recorded after first run, with variance note)
- in scope: skills/, agents/, hooks/, scripts/, installer/ / out of scope: bench/**, tests/ thresholds, this metric

# Verification log
<!-- only the ultragoal:verifier subagent appends here -->

# Decision journal
- 2026-06-11 armed as the successor to harness-bench (owner chose replace); salvaged rows are corroborating data, not the official baseline — protocol requires the frozen command's own first run.
- 2026-06-11 cost decomposition from the smoke run's surviving transcript (zero new spend): 70 assistant messages × ~46k avg cached context = 3.2M cache-read tokens; 113k output tokens of ceremony prose (Write:14 — spec, scaffold, journal, distillation) for a one-line fix; verifier subagent only ~268k weight. Cost = messages × context, dominated by loop ceremony, NOT verification. Experiment 1 target: adaptive lean path in skills/goal/SKILL.md for non-interactive small briefs (compact spec, no scout/recap ceremony, end-only verification, one-line distillation) — attacks both factors.
- 2026-06-11 paused while the frozen baseline measure runs (3 parallel sandboxes); harness files untouchable mid-measure (sandboxes read the working tree via --plugin-dir). Monitor armed; resumes on completion.
- 2026-06-11 owner tightened intensity mid-baseline: 6→4 max iterations, immediate stop on target-met. Metric, guards, and target unchanged — only the attempt budget shrank.
- 2026-06-11 abandoned minutes later, before baseline row 1 existed: owner stopped the experiment entirely ("let's not experiment… I liked our original version's simplicity — cut bloat and overengineering"). Baseline measure killed mid-flight (3 sandboxes, no orphans); the frozen --measure mode and the decomposition findings remain in the tree for any future opt-in. Successor work: judgment-based bloat cuts validated by the test suite, outside a goal loop.

# Native fallback
/goal all rubric items in .ultragoal/goals/active/cost-ratchet/goal.md are checked with evidence and the verification log ends with ULTRAGOAL-VERIFIED: PASS, or stop after 35 turns
