# Harness feedback log

<!-- ultragoal's own failure observations, for improving the plugin. OPT-IN via the harness-log knob.
     Local markdown only — never transmitted; you choose whether to share it.
     Distinct from project memory: harness shortcomings go HERE; project dead ends go in
     memory/failures.md; project facts/corrections go in memory with [USER-CORRECTION].
     One entry per incident, newest at the bottom:
       ## [YYYY-MM-DD] <short title>
       - trigger: <what the user flagged / what didn't work>
       - component: rubric | gate | verifier | interview | skill-prompt | budget | memory | other
       - why: <why the harness caused or allowed it>
       - improvement: <the concrete change to ultragoal that would prevent this class>
       - provenance: [USER-FEEDBACK · date] | [INFERRED] -->

## [2026-06-13] Research/audit memo shipped confident-but-wrong claims twice before the verifier caught them
- trigger: the omp-feasibility memo asserted "omp has no goal loop" (it does, in src/goals/) and falsely attributed the term "dynamic workflows" to omp's README; both passed all grep-based rubric checks and were only caught when the verifier re-fetched source.
- component: rubric (a research/audit rubric whose checks only prove the memo *says* X, never that X is *true*).
- why: for research goals the worker's own greps confirm presence of citations, not their accuracy; nothing forced an independent re-fetch of the cited source before the final verifier pass.
- improvement: the goal skill's research/audit path should template a rubric item like "the verifier independently re-fetches ≥N cited sources and confirms the load-bearing claims," and the verifier dispatch for research goals should carry the raw-fetch recipe (gh/curl) by default. Make source-grounding a first-class check, not a worker habit.
- provenance: [INFERRED] from this session's omp goal (2 verifier FAILs → PASS); corroborated by [VERIFIED] verifier reports.

## [2026-06-13] Audit-only "nothing changed" check falsely failed on prior uncommitted work
- trigger: the self-improvement-audit goal's item-6 check (`git status engine dirs is clean`) would have FAILed because the working tree already carried prior uncommitted rigor/budget changes — not this goal's doing. Caught at draft time before any verifier run, but only because the same trap had bitten the rigor-modes goal earlier.
- component: rubric / skill-prompt (the goal skill doesn't warn that a dirty working tree breaks absolute "nothing-else-changed" checks).
- why: "unchanged" constraints implicitly assume HEAD is the baseline, but the real baseline is the working tree at arm time when prior uncommitted work exists.
- improvement: the goal skill should, at arm time, detect a dirty working tree and (a) warn the user, and (b) for any "nothing else changed" constraint, snapshot the relevant paths' `git status` to a baseline sidecar and template the check as current-vs-baseline. Bake the rigor-modes lesson into the skill instead of re-deriving it per goal.
- provenance: [USER-FEEDBACK · 2026-06-13] (rigor-modes baseline correction) + [INFERRED] generalization.

## [2026-06-13] UI "renders" item shipped empty — checked off on static evidence the verifier couldn't see past
- trigger: a "Creators to follow" rail rendered empty on a real device though the data was healthy (root cause: a horizontal virtualized list nested in a vertical ScrollView collapsing to 0 height). The rubric's "rail renders" item had been checked `[x]` on `grep CreatorsRail` + a "device-deferred" footnote. Every static check (grep/typecheck/eslint/vitest) and the interim verifier passed; the human device round — the only rubric item in the whole goal that drew a pixel, and the last one — was the first thing to catch it.
- component: rubric (a behavioral/visual claim verified by a static proxy) + verifier (inherits the blind spot — re-runs only the checks the rubric defines, none of which render) + skill-prompt/interview (no left-shifted visual gate; the self-run simulator pattern had been archived wholesale, conflating "observe a screen" with "drive a flow").
- why: nothing between writing the component and the human device round ever rendered it. A grep passes whether the rail shows 10 cards or nothing; the verifier can only re-run rubric checks and owns no pixel-drawing tool, so a green static check on a behavioral claim is an undetectable false positive until a human looks. A coarse memory rule ("use FlashList/LegendList for rails") was also applied over a working in-repo precedent (the home Featured carousel uses a horizontal ScrollView).
- improvement: (1) rubric-guide — a check must exercise the same layer the claim lives in; behavioral/visual claims verified only by static commands are now an explicit anti-pattern with a wired-vs-renders split pattern. (2) rn-feature + nextjs-react-feature templates — added a left-shifted, agent-run visual-smoke item (non-interactive screenshot / rendered-size assertion) before the manual device round; a static screenshot is observation, not driving. (3) verifier — a behavioral item backed only by a static check is an inadequate check → FAIL, not pass. (4) skill-prompt — defect taxonomy gains the layer-mismatch defect, and a "prefer in-repo precedent over a coarse memory rule" execution rule.
- provenance: [USER-FEEDBACK · 2026-06-13] (the empty rail, caught on device).
