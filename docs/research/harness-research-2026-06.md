# Harness & model-behavior-control research — June 2026

Four parallel research sweeps (Anthropic official, AI-engineering practitioners, Chinese labs, academic agent-systems), run 2026-06-11, hunting ideas beyond Anthropic's Fable 5 prompting guide (already fully implemented in ultragoal as of v0.11.1). Findings graded on the two axes that determine loop-outcome quality: **context richness** and **feedback-signal richness**.

## Anthropic

- **Calibrated evaluators + generator–evaluator contracts** — models confidently praise their own mediocre work; a separate evaluator drifts unless anchored with few-shot scored examples; pre-agreed testable criteria frozen *before* building prevent wrong-thing-built. [Harness design for long-running apps](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- **Task budgets**: a model-visible countdown produces graceful pacing; too-small budgets cause scope-down and refusal-like behavior. [Task budgets](https://platform.claude.com/docs/en/build-with-claude/task-budgets)
- **Advisor tool**: executor consults a stronger model at decision points (pre-commit, recurring errors, pre-done-claim). [Advisor tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool)
- **Agent-teams gate hooks**: `TaskCompleted` / `TeammateIdle` exit-2 blocking — the Stop-gate mechanism at per-task granularity. [Agent teams](https://code.claude.com/docs/en/agent-teams)
- **Grader design rules**: grade end-state not trajectories; 0% pass usually means broken check; include must-NOT-happen cases; every graded criterion visible to the worker. [Demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- **Verifier-grade feedback must be compact**: ERROR-prefixed lines, pre-computed aggregates, capped output; flawed verifiers get faithfully gamed; lock-files coordinate parallel agents. [Building a C compiler](https://www.anthropic.com/engineering/building-c-compiler)
- **Strip the worker's reasoning from the judge's view**: auto-mode's classifier judges raw action payloads only — persuasive rationalizations contaminate model judges. [Auto mode](https://www.anthropic.com/engineering/claude-code-auto-mode)
- **Session as append-only event log**, stateless harness recovers by replay. [Managed agents](https://www.anthropic.com/engineering/managed-agents)
- **Flip-only structured state**: feature lists the agent may flip but never edit; smoke-test-on-entry; one item per session. [Effective harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- **Eval awareness**: models detect contrived test framing and defeat the test infrastructure instead of doing the task — check commands are attack surface. [Eval awareness](https://www.anthropic.com/engineering/eval-awareness-browsecomp)

## Practitioners

- **Make the problem feedback-loopable first**: build the headless/structured-text representation of "done" before looping. [Amp: feedback-loopable](https://ampcode.com/notes/feedback-loopable)
- **Failure-signal recycling**: every failure becomes a durable lint/hook/skill, not prose; ratchets convert soft goals into binary signals. [OpenAI: harness engineering](https://openai.com/index/harness-engineering/)
- **Reviewer calibration**: asymmetric authority, P0-only thresholds, bounded rebuttals — symmetric author↔reviewer authority oscillates. [Latent.Space: harness eng](https://www.latent.space/p/harness-eng)
- **Context anxiety**: models underestimate remaining context and corner-cut near perceived limits; Devin's fix — generous perceived runway, external enforcement. [Cognition: Devin lessons](https://cognition.ai/blog/devin-sonnet-4-5-lessons-and-challenges)
- **Cycle-boundary judging**: planner/worker/judge with fresh-context judge deciding continue/replan/stop each cycle beats one long run. [Cursor: scaling agents](https://cursor.com/blog/scaling-agents)
- **Anti-cheating prose is near-worthless** under incentive pressure (METR): checkability and tamper-evidence are the defense, not exhortations. [METR: reward hacking](https://metr.org/blog/2025-06-05-recent-reward-hacking/)
- **Judge calibration discipline**: TPR and TNR separately ≥80% against a gold set; judges drift silently. [Hamel: evals FAQ](https://hamel.dev/blog/posts/evals-faq/)
- **Harness compounds, model resets**: every agent error should become a permanent environmental fix. [Mitchell Hashimoto](https://mitchellh.com/writing/my-ai-adoption-journey)
- **Reviewer gets its own toolset** and curated reading order, not the author's context. [Amp: agentic review](https://ampcode.com/news/agentic-code-review)

## Chinese labs

- **RuscaRL (Alibaba/Zhejiang)**: rubric-in-the-worker's-context measurably improves rollouts; same rubric doubles as judge reference. [arXiv:2508.16949](https://arxiv.org/abs/2508.16949)
- **Kimi K2 (Moonshot)**: self-critique against fixed rubrics stays calibrated only when anchored by objectively verifiable items — objective accuracy gates subjective trust. [arXiv:2507.20534](https://arxiv.org/pdf/2507.20534)
- **SPCT / DeepSeek-GRM**: judges are markedly more accurate when forced to generate evaluation principles *before* critiquing; sampled judgments + voting beat one big judge. [arXiv:2504.02495](https://arxiv.org/abs/2504.02495)
- **Heimdall (ByteDance)**: verification accuracy 94.5%→97.5% from repeated sampling; pessimistic selection (any flag = fail) lifted solver accuracy up to +29pp; verifiers also surface flawed task specs. [arXiv:2504.10337](https://arxiv.org/abs/2504.10337)
- **SmartSnap (Tencent)**: judges verify +26% better from curated evidence bundles than full logs; making evidence-collection an explicit agent duty changes execution behavior. [arXiv:2512.22322](https://arxiv.org/abs/2512.22322)
- **IterResearch (Alibaba)**: "context suffocation" — periodically rebuilding a minimal workspace around a compressed state report sustains capability at arbitrary horizon. [arXiv:2510.24701](https://arxiv.org/abs/2510.24701)
- **DeepSeek-R1**: self-verification is a trained, in-distribution behavior that *grows with budget* — verify-before-stop gates trigger latent behavior rather than fight it; truncating budget suppresses exactly the self-correction phase. [arXiv:2501.12948](https://arxiv.org/abs/2501.12948)
- **Qwen PRM lessons**: process judges secretly collapse to outcome-matching; independent per-item checks and cross-method agreement filter the noise. [arXiv:2501.07301](https://arxiv.org/abs/2501.07301)
- **Agent-R (ByteDance)**: recovery quality depends on *where* revision begins — earliest-error splice beats full restart and end-of-trajectory reflection. [arXiv:2501.11425](https://arxiv.org/abs/2501.11425)
- **MemOS**: memory units with provenance + version + lifecycle metadata, scheduled like OS resources. [arXiv:2507.03724](https://arxiv.org/abs/2507.03724)

## Academia

- **Harness ablations**: gains come from tools, middleware, memory structure — not system-prompt wording; harness structure transfers across model families, prose doesn't. [arXiv:2604.25850](https://arxiv.org/abs/2604.25850)
- **Cross-family verification beats self/same-family**; reasoning-trained models get *worse* at self-verification; verification pays most on structured/checkable tasks. [arXiv:2512.02304](https://arxiv.org/abs/2512.02304)
- **Perplexity self-preference**: judges favor fluent, familiar text regardless of author — the worker's polished self-report is exactly what biases a judge. [arXiv:2410.21819](https://arxiv.org/abs/2410.21819)
- **Context length is intrinsically harmful** (13.9–85% degradation even with perfect retrieval); reciting relevant evidence before answering recovers part. [arXiv:2510.05381](https://arxiv.org/abs/2510.05381), [Chroma: context rot](https://research.trychroma.com/context-rot)
- **ACE**: context as itemized, delta-edited bullets; monolithic rewrites cause context collapse; summarization causes brevity bias that strips load-bearing detail. [arXiv:2510.04618](https://arxiv.org/abs/2510.04618)
- **Experience-following**: memories are behavioral attractors — erroneous entries reproduce errors; write-gating + utility-based deletion gives +10% absolute. [arXiv:2505.16067](https://arxiv.org/abs/2505.16067)
- **Memp**: store verified *procedures* (the command sequences that worked), not just lessons; procedural memory transfers across models. [arXiv:2508.06433](https://arxiv.org/abs/2508.06433)
- **Recursive rubric refinement**: rubric defect taxonomy — compound items, redundant/correlated criteria double-counting, coverage gaps; fixing lifts judge accuracy up to +17.7pp. [arXiv:2602.05125](https://arxiv.org/abs/2602.05125)
- **Rubrics as Rewards**: decomposed per-criterion checks beat holistic judging by up to 31% relative and reduce judge-capability-dependence. [arXiv:2507.17746](https://arxiv.org/abs/2507.17746)
- **Adaptive verification granularity**: verifying at high-uncertainty points beats end-only and constant verification (+3.1–3.6% at <half the compute). [arXiv:2505.11730](https://arxiv.org/abs/2505.11730)

## Ranked ideas

Leverage = (impact on feedback-signal/context quality × cross-community convergence) ÷ implementation cost.

| # | Idea | Sources | Axis | Leverage rationale | Verdict |
|---|------|---------|------|--------------------|---------|
| 1 | **Evidence ledger**: worker records `evidence:` (command + key output) under each rubric item as it checks it; gate nags on checked-without-evidence; verifier audits the bundle first, then re-runs | SmartSnap (+26%), Anthropic effective-harnesses flip-only state, Anthropic harness-design contracts | both | Strongest convergent finding; formalizes our informal "never check without evidence" into a checkable artifact; cheap (gate+skill+template) | **IMPLEMENTED** |
| 2 | **Verifier hardening pack**: principles-before-critique, evidence-bundle-first, recite-item-before-verdict, double-run near-threshold checks with pessimistic aggregation, earliest-failure localization, narrative-is-not-evidence | SPCT, Heimdall (94.5→97.5%), Agent-R, perplexity bias, auto-mode, context-rot recitation | feedback-signal | Six research results land in ONE file (verifier.md) with zero engine risk | **IMPLEMENTED** |
| 3 | **Rubric defect linter + compact-output rule**: split compound items, drop correlated double-counts, check brief coverage, add must-NOT items, require checks to emit one decisive line (wrap noisy commands) | Recursive rubric refinement (+17.7pp), demystifying-evals, C-compiler post | feedback-signal | The rubric is the contract everything hangs on; defect taxonomy is concrete and promptable | **IMPLEMENTED** |
| 4 | Lessons → enforcement artifacts: recurring failures become hooks/lints/scripts, not prose notes | Hashimoto, OpenAI harness-engineering | both | High conviction, but belongs in a considered remember/compact rework | deferred |
| 5 | Append-only `events.jsonl` per goal (check runs, box flips, verdicts) for crash-exact resume + verifier audit trail | Managed-agents post | context | Real value, real complexity; needs design for size/rotation | deferred |
| 6 | Different-model verifier (cross-family verification) | arXiv:2512.02304 | feedback-signal | Evidence is strong but it's a cost/policy decision for the owner — needs a knob, not a silent change | deferred |
| 7 | Budget-visibility tuning: hide/soften late-budget countdown to avoid scarcity-driven corner-cutting; auto-extend on failed verification | Cognition context-anxiety, R1 budget-suppression, Anthropic task-budgets | other | Evidence points both ways (visible budgets aid pacing AND trigger wrap-ups); needs measurement before changing the gate | deferred |
| 8 | Per-task gate via agent-teams `TaskCompleted`/`TeammateIdle` hooks | Agent teams docs | feedback-signal | Behind an experimental flag; revisit when teams GA | deferred |
| 9 | Memory delta-edit + active-deletion discipline in compact skill; last-confirmed-at metadata | ACE, experience-following, MemOS | context | Compact skill rework — pairs with idea 4 | deferred |
| 10 | Procedural memory: archive the verified command sequence per goal as a reusable script library | Memp | context | Interesting; overlaps rubric-library territory; needs a retrieval story | deferred |

## Implemented

1. **Evidence ledger** — `scripts/goal-gate.sh` (checked-items-without-evidence nag, fail-open preserved), `tests/gate-test.sh` (2 new cases), `skills/goal/SKILL.md` (record evidence when checking a box), `skills/goal/goal-template.md` + `skills/goal/rubric-guide.md` (the convention), `agents/verifier.md` (checked box without evidence = automatic FAIL).
2. **Verifier hardening pack** — `agents/verifier.md`: principles-first restatement, evidence-audit-then-re-run order, recitation before verdict, double-run + pessimistic aggregation for near-threshold/previously-failed checks, earliest-failure localization in FAIL reports, journal-is-context-not-evidence rule.
3. **Rubric defect linter + compact-output rule** — `skills/goal/SKILL.md` Phase 3 adversarial review extended with the defect taxonomy; `skills/goal/rubric-guide.md` new principle: checks emit one decisive line, wrap noisy commands.

Validation: `bash tests/gate-test.sh` (41 cases) exits 0; `claude plugin validate .` passes; `node --check installer/cli.mjs` clean.
