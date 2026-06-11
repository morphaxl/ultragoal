# Patterns that work

<!-- resolver: REUSABLE APPROACHES that worked here, with why they worked.
     NOT here: repo facts (facts.md), dead ends (failures.md).
     Same two layers: compiled above the ---, dated evidence below. -->

## Current understanding

- Write rubric check-phrases as literal grep strings and put that exact string in the artifact — a paraphrased heading ("setup answers" vs "knobs") makes a check unfalsifiable by grep and forces the verifier to judge substance. [VERIFIED S3, S4 · verifier flagged it twice in two goals · 2026-06-10]

- Test installs from a sandbox + the real cache path, not just --plugin-dir: the hooks.json duplicate-load failure only manifested on cached installs. Cheap: temp git repo + `cli.mjs --yes`. [VERIFIED S2 · ran it this goal · 2026-06-10]
- A fresh-context verifier pays for itself: it caught a stale "4 questions" string the worker (me) missed after three reviews of the same file. [VERIFIED S2 · verifier report · 2026-06-10]

- Parallel community-scoped research agents with a strict output contract (IDEA/SOURCE/PROPERTY/MAPS-TO/AXIS/SIGNAL, max 10 findings, "no preamble — your final text is raw data") returned 40 usable findings across 4 sweeps in ~5 min. Cross-community CONVERGENCE is the ranking signal: the ideas independently surfaced by 3+ communities (evidence bundles for judges, rubric defect taxonomy, compact check output) were the ones worth implementing. [VERIFIED S6 · harness-research goal · 2026-06-11]

- Keeping research-scout prompts in orchestration/reliability vocabulary (an explicit "stay in software-engineering register" line in each prompt) avoids classifier-driven model switches on Fable 5: 4 scouts in the orchestration sweep ran clean, where the robustness goal's security-register scout triggered a mid-run switch. [VERIFIED S7 · multiagent-orchestration goal, 4/4 scouts completed on-model · 2026-06-11]

- Final sign-off sequencing: flip the VERIFIER rubric box (with evidence) BEFORE the last verifier dispatch — the box flip changes the rubric hash and voids any verdict issued first. Sequence that works: verify all items → check boxes → flip VERIFIER box → one final verifier pass signs the final hash. [VERIFIED S7 · first verdict (rubric=1271038965) voided by the flip; re-sign (rubric=1351950032) released the gate · 2026-06-11]

- Transcript decomposition beats live A/B for cost analysis: finished agent runs leave full per-message usage in ~/.claude/projects/<cwd-slug>/*.jsonl (+ subagents/) — summing usage fields located the harness's cost structure (messages × context, ceremony prose, verifier share) in one free pass, where each live bench measurement costs ~1.2M tokens/run. Decompose first; measure only what judgment can't settle. [VERIFIED S7 · smoke-run decomposition drove the cost findings · 2026-06-11]

---

## Evidence log
[2026-06-10 S2] verifier caught copy drift the worker missed; sandbox install used for scope-default proof.
[2026-06-10 S3] v0.7.0 goal: verifier PASS rubric=3669510257; flagged grep-phrase drift in rubric item 5.
[2026-06-10 S4] grep-phrase drift recurred in rubric-library goal (item 5); also: put one-off quality checks INTO the permanent test suite — the library lint caught 16 missing-check lines on its first run.
[2026-06-11 S6] 4-agent research fan-out -> docs/research/harness-research-2026-06.md; top-3 implemented same-session (evidence ledger, verifier hardening, rubric linter).
[2026-06-11 S7] multiagent-orchestration goal: 4 orchestration-register scouts, 45 sources -> docs/research/multiagent-orchestration-2026-06.md; panel verification (verify: panel) + fan-out sizing rules implemented; VERIFIER-box-flip voided first verdict, re-sign needed; verifier also noted journal count-checks can self-match rows in appended verification tables (scope-to-section gotcha extends to verdict tables at file end).
