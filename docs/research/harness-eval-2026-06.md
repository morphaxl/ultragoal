# Harness-evaluation methodology research — June 2026

Two parallel sweeps (lab/practitioner eval methodology; small-N statistics), run 2026-06-11, to design `bench/` — ultragoal's self-measurement instrument: 3 seeded tasks × 2 arms (ultragoal vs vanilla Claude Code) × 3 repetitions, identical briefs and scripted end-state checks, varying only the harness. Companion to the [harness](harness-research-2026-06.md) and [orchestration](multiagent-orchestration-2026-06.md) sweeps.

## Methodology rules (labs & practitioners)

- **Grade the end state, never the path** — trajectory checks are brittle; agents find valid approaches the author didn't anticipate. 0% pass across trials usually means a broken task, not an incapable agent. Include must-NOT-happen assertions; deterministic graders over LLM judges; every trial starts from a pristine isolated environment. [Anthropic: demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- **Validate every task before comparing systems** — SWE-bench's human audit found 38.3% of tasks underspecified and 61.1% with unfairly rejecting tests; fixing the benchmark *doubled* GPT-4o's score (16% → 33.2%). The benchmark was measuring its own bugs. [OpenAI: SWE-bench Verified](https://openai.com/index/introducing-swe-bench-verified/)
- **Fail-to-pass gating for seeded defects** — a planted bug counts only if the check demonstrably fails pre-fix and passes post-reference-fix. [SWE-smith](https://arxiv.org/pdf/2504.21798)
- **The cleanest harness-vs-harness protocol**: factorial design fixing prompt, initial sandbox, budget, timeout, and evaluator while varying only the harness — each harness kept in its *native* form. Observed 23.8-point aggregate gap between best and worst harness on identical conditions (5,194 trajectories). [Harness-Bench](https://arxiv.org/html/2605.27922v1)
- **Same model, different scaffold is a first-order effect** — reported swings of +20–36 points from scaffold alone, so a small bench can plausibly detect harness deltas. [HAL scaffold ablations (secondary)](https://medium.com/@adambaitch/the-model-vs-the-harness-which-actually-matters-more-59dd3116bb31)
- **Cost is half the result** — report tokens/cost jointly with accuracy or retry-heavy scaffolds look better for free; publish all raw rollouts. [HAL, Princeton](https://arxiv.org/pdf/2510.11977) · [Kapoor et al.: AI Agents That Matter](https://arxiv.org/abs/2407.01502)
- **Reliability ≠ capability**: pass@k flatters (70% pass@1 → 97% pass@3) while pass^k exposes consistency (→ 34% pass^3); report both. [τ-bench](https://arxiv.org/abs/2406.12045)
- **Reps are mandatory** — Terminal-Bench runs ≥5 reps per agent+model cell against run-to-run variance (32,155 trials); 3 reps is a floor, not a norm. [Terminal-Bench 2.0](https://arxiv.org/abs/2601.11868)
- **Avoid contaminated task material** — models locate famous repos' bugs from issue text alone (up to 76%); freshly authored sandbox repos over public-project copies. [SWE-Bench Illusion](https://arxiv.org/html/2506.12286v4) · [OpenAI deprecation note](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/)
- **Task-as-portable-package** (environment seed + scripted scorer, harness-agnostic) is the interchange standard. [METR task standard](https://metr.org/blog/2024-02-29-metr-task-standard/) · Practitioner self-bench template: fully scripted grading, fixed retry protocol. [Aider polyglot bench](https://github.com/Aider-AI/aider/blob/main/benchmark/README.md)

## Statistics at small N

- **Paired design or nothing**: run both arms on the same task instances and analyze per-task differences — pairing cuts estimator variance ~1/3 even at modest correlation; cluster on the unit of randomization (the task), never the individual run. [Anthropic: error bars for evals](https://arxiv.org/abs/2411.00640)
- **No CLT or bootstrap below a few hundred datapoints** — both undercover catastrophically at N=3–30 (bootstrap CIs far too narrow on tiny binary samples); use Wilson score intervals or Beta(1+S, 1+N−S) posteriors per arm, and a paired Bayesian posterior on the difference, reporting P(A > B). [Bowyer et al., ICML 2025](https://arxiv.org/abs/2503.01747) · [Wilson vs bootstrap at tiny n](https://pmc.ncbi.nlm.nih.gov/articles/PMC4789773/)
- **Known variance floor**: identical agentic configs at temperature 0 still swing 2.2–6.0pp between runs (inference nondeterminism); detecting a 2pp delta needs ~9 runs/arm, 1pp needs ~36. At 18 runs total, only large (tens-of-pp) effects are honestly detectable — say so in the report. [On randomness in agentic evals](https://arxiv.org/abs/2602.07150)
- **Variance decomposition caveat**: on hard agentic tasks, most observed variance is trial-to-trial randomness, not task difficulty; estimates stabilize at 8–16 trials — below that, report spread and direction, not significance. [ICC for agentic evals](https://arxiv.org/html/2512.06710v1)
- **pass@k needs the unbiased combinatorial estimator** (1 − C(n−c,k)/C(n,k)), and is barely estimable at n=3; Beta posteriors per task beat raw thirds. [HumanEval estimator](https://arxiv.org/abs/2107.03374) · [Bayesian pass@k](https://arxiv.org/abs/2510.04265)
- **Sequential stopping requires pre-registered boundaries** — peeking-and-stopping when the gap looks good inflates false positives; at 18 runs use only as pre-committed futility guidance. [ConSol/SPRT](https://arxiv.org/abs/2503.17587)

## Design decisions for bench/

| Rule | Implementation |
|---|---|
| End-state, deterministic grading | each task ships `check.sh`: scripted assertions, one decisive output line, exit code is the verdict |
| Fail-to-pass task validation | `run.mjs --selftest`: seeds each task, asserts check FAILS; applies `reference.sh`, asserts check PASSES |
| Must-NOT assertions | every task's check includes ≥1 negative assertion (e.g. test files unmodified by hash) |
| Pristine environment per rep | fresh `mktemp -d` sandbox seeded from scratch for every run; nothing reused |
| Vary only the harness | identical `brief.txt`, model, sandbox, and grader; ultragoal arm runs its native goal loop via `--plugin-dir` at the pinned commit; vanilla arm gets the bare brief |
| Cost beside accuracy | TSV row per run: task, arm, checks passed, turns, tokens, model, harness commit; all 18 raw rows published |
| Reliability beside capability | per-task 3/3-consistency (pass^3-style) reported next to mean pass rate |
| Honest small-N statistics | BASELINE.md reports raw outcomes, Wilson/Beta intervals per arm, per-task paired direction, P(ultragoal > vanilla) framing — no p-values, no CLT/bootstrap error bars; explicit caveat that 3 reps detects only large effects |
| Contamination hygiene | task repos freshly authored for this bench, not derived from public projects |

## Implemented

(filled at goal completion — instrument files, validation evidence, baseline summary)
