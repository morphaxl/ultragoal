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

## [2026-06-14] Gate's evidence parser and rubric hash are coupled to cosmetic formatting — a no-op reformat forced an expensive re-verify
- trigger: dogfooding the chat-challenges-p1 goal, the gate's checked-without-evidence count falsely flagged items whose description wrapped across multiple lines (the evidence line was real, just not on the immediately-following line), and the fix — collapsing each item to one line, plus reflowing one evidence block — moved the rubric hash three times (3000890955 → 3648216910 → 785393278). Each move invalidated a fresh verifier PASS and forced a re-run: a ~42.9k-token / 3-min panel re-verify for a change the Decision journal itself labeled "no check weakened."
- component: gate
- why: two coupled mechanisms. (1) the evidence ledger awk (`goal-gate.sh:157-160`) inspects only the single line immediately after each `- [x]` box, so a multi-line item *description* reads as "no evidence." (2) the rubric hash (`goal-gate.sh:97`) strips only the FIRST `- evidence:` line and normalizes checkboxes, but description prose, `- check:` bullets, and evidence *continuation* lines all feed `cksum` — so a purely cosmetic edit moves the hash. Flaw 1 forces a reformat; the reformat trips flaw 2. The script's own comment at L95 ("evidence lines are normalized out, so marking items done never voids a verdict") over-promises: only the first evidence line is normalized out, not its continuations.
- improvement: (a) evidence parser — scan forward from a `[x]` box to the next box/blank boundary and count it satisfied if ANY line in that block contains `evidence:`, removing the single-line constraint. (b) hash — strip the ENTIRE evidence block (from `- evidence:` to the next `- [`/blank), and ideally hash only normalized check *identity* (item number + `- check:` text, whitespace-collapsed) so prose reflow and `- check:`-bullet cleanup don't void a substance-only verdict; the hash should fire on weakening a check, not on rewrapping a line. Fix the L95 comment to match whatever it actually normalizes. (c) until then, the goal-template should model single-line descriptions with `- evidence:` immediately under each box, the goal skill should state it, and the gate's no-evidence error should hint "the evidence line must be the FIRST line under the box."
- provenance: [USER-FEEDBACK · 2026-06-14] ("is there anything to learn from this?") + [VERIFIED] by reading `goal-gate.sh:97,157-160`.
