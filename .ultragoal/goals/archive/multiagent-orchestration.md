---
slug: multiagent-orchestration
status: done
kind: task
budget: 35
session: dac81d85-0391-4177-b6ec-c935b38ff5e4
verify: on
created: 2026-06-11
---

# Objective
Research the multi-agent orchestration frontier — how labs and practitioners structure orchestrator/worker/judge systems, parallel subagent fan-out, role asymmetry, and inter-agent communication — and implement ONE substantial value-add feature for ultragoal based on the strongest convergent findings (plus a smaller runner-up if budget allows). The product reason: Fable 5 is documented as significantly more dependable at dispatching and sustaining parallel subagents; ultragoal's loop currently uses subagents only for the verifier and ad-hoc scouts, leaving that strength on the table.

# Context
- Owner delegated the delta-choice, then ratified: tangent = multi-agent orchestration (overrode my compounding-memory recommendation); contract = research memo + 1 substantial feature + small runner-up, tests + docs, budget 35, no release unasked.
- Owner killed the other session's robustness-research goal (archived 2026-06-11) to free the tree; its themes (failure taxonomies, resume, flakiness) are OUT of scope here.
- SCOPED OUT — offensive-security and biology framings: Fable 5's safety classifiers cover those domains (per research/fable5-prompting-guide.md); a scout in security register caused a mid-run model switch in a prior goal. All research prompts stay in orchestration/reliability vocabulary.
- My calls: memo at docs/research/multiagent-orchestration-2026-06.md; four community sweeps (Anthropic official / practitioners / Chinese labs / academia); deferred ideas 6 (cross-model verifier) and 8 (agent-teams per-task gates) from docs/research/harness-research-2026-06.md are orchestration-adjacent — re-rank against fresh findings, don't auto-implement.
- Implementation surface: plugin constraints only (skills/, agents/, hooks/, scripts/, installer/) — the feature must work in stock Claude Code.
- Prior art to not re-find: evidence ledger, verifier hardening pack, rubric defect linter (all shipped in v0.11.x, see harness memo "## Implemented").
- Machinery: 4 parallel research subagents, verifier dispatched before claiming any rubric item (config cadence: every-claim), Decision journal for rejects.
- Gotchas honored: journal count-check anchored to line-start section header (self-match lesson); new docs land in existing docs/research/ (gitignore already vetted).

# Rubric
- [x] Research memo exists with ≥15 distinct primary-source links — check: `grep -oE 'https?://[^ )]+' docs/research/multiagent-orchestration-2026-06.md | sort -u | wc -l` ≥ 15
  - evidence: `grep -oE 'https?://[^ )]+' docs/research/multiagent-orchestration-2026-06.md | sort -u | wc -l` -> 45
- [x] Memo has ≥4 community sections (Anthropic / practitioners / Chinese labs / academia) — check: `grep -c '^## ' docs/research/multiagent-orchestration-2026-06.md` ≥ 4 with those communities present
  - evidence: `grep -c '^## ' docs/research/multiagent-orchestration-2026-06.md` -> 6; headers are Anthropic, Practitioners, Chinese labs, Academia, Ranked ideas, Implemented
- [x] Ranked-ideas table with ≥8 candidates carrying leverage rationale — check: data rows in the table under `## Ranked ideas` ≥ 8
  - evidence: `awk '/^## Ranked ideas/,/^## Implemented/' docs/research/multiagent-orchestration-2026-06.md | grep -c '^| [0-9]'` -> 12
- [x] Top idea implemented end-to-end; memo `## Implemented` maps idea → files → validation — check: section names the feature; named files differ from HEAD in `git diff --stat`
  - evidence: `git diff --stat` -> scripts/goal-gate.sh +35/-7, tests/gate-test.sh +21, agents/verifier.md +11, skills/goal/SKILL.md +6/-2, skills/goal/goal-template.md, skills/setup/SKILL.md, installer/cli.mjs, docs/research-foundations.md all changed; memo Implemented entry 1 = panel verification mapping idea -> these files -> validation
- [x] Runner-up: a second smaller idea implemented (second entry in `## Implemented`), or an explicit `runner-up deferred:` line in the Decision journal with reason — check: one of the two present
  - evidence: memo Implemented entry 2 = fan-out sizing rules in skills/goal/SKILL.md (new paragraph in diff)
- [x] Engine healthy — check: `bash tests/gate-test.sh` exits 0 with ≥41 passed; `claude plugin validate .` passes; `node --check installer/cli.mjs` exits 0
  - evidence: `bash tests/gate-test.sh` -> "passed: 47  failed: 0"; `claude plugin validate .` -> "Validation passed"; `node --check installer/cli.mjs` -> exit 0
- [x] Any change to scripts/goal-gate.sh or scripts/session-context.sh carries ≥1 new test case — check: if either script's diff is non-empty, gate-test pass count > 41; otherwise vacuous
  - evidence: goal-gate.sh diff non-empty; gate-test pass count 47 > 41 (6 new panel cases); session-context.sh untouched
- [x] docs/research-foundations.md gains ≥1 row for each implemented mechanism, citing its sources — check: `git diff --stat docs/research-foundations.md` non-empty; new row(s) present
  - evidence: `git diff --stat docs/research-foundations.md` -> 5 insertions, 1 deletion; rows added for panel verification (BoN-MAV, PoLL, herding, MacNet), verifier independence, and fan-out sizing rules
- [x] ≥3 rejected ideas in the Decision journal with reasons — check: `awk '/^# Decision journal/,0' .ultragoal/goals/active/multiagent-orchestration/goal.md | grep -c 'rejected:'` ≥ 3
  - evidence: `awk '/^# Decision journal/,0' .ultragoal/goals/active/multiagent-orchestration/goal.md | grep -c 'rejected:'` -> 5
- [x] VERIFIER: independent sign-off recorded in the Verification log
  - evidence: verifier appended `ULTRAGOAL-VERIFIED: PASS rubric=1271038965`; re-signed against the final rubric hash after this box flip (see last verdict line)

# Stop conditions
- 35 turns reached, or 2 consecutive research rounds with no new medium+ idea, or same item fails verification 3 consecutive times

# Constraints
- No version bump, tag, or release — check: no new git tags; package.json and .claude-plugin/plugin.json versions unchanged
- Fail-open invariant intact in any script change — verifier reads the diff
- Always-on context net addition ≤ 10 lines — verifier diffs session banner output
- Research prompts avoid Fable-5-classifier domains (offensive cyber, bio) — orchestration/reliability vocabulary only

# Verification log
<!-- only the ultragoal:verifier subagent appends here -->

# Decision journal
- 2026-06-11 tangent ratified by owner: multi-agent orchestration over compounding-memory and experiment-rigor alternatives.
- 2026-06-11 top feature chosen: panel verification (`verify: panel`) — the sweep's strongest convergent finding (aspect-split verifier ensembles) landing on the loop's most load-bearing moment (release), pure prompt+gate change.
- 2026-06-11 runner-up implemented: fan-out sizing rules in the goal skill (read-heavy-only parallelism, 2–4 scouts for comparisons, three focused beat five scattered).
- 2026-06-11 rejected: verifier deliberation/debate round between panelists — strong negative evidence (sycophantic correct→incorrect flips, herding under vote visibility, non-replication of debate gains); panelists stay parallel and blind instead.
- 2026-06-11 rejected: holdout rubric checks hidden from the working session (StrongDM pattern) — unenforceable on the plugin surface since the worker has filesystem access; revisit if Claude Code grows per-agent file ACLs.
- 2026-06-11 rejected: stronger-model/cross-tier verifier (oracle pattern) — a cost/policy knob the owner should set, and lens diversity captures much of the ensemble gain within one model family; carried as deferred in the memo.
- 2026-06-11 rejected: worker-side parallel generation (N attempts + judge) — single agents reach parity at equal compute; the 15× token cost pays only for read-heavy research, not sequential build loops.
- 2026-06-11 rejected: mid-trajectory guard checkpoints (AWorld) — already covered by the every-claim verification cadence; marginal net-new value.
- 2026-06-11 panel scoped to the FINAL sign-off only (interim claims keep the single verifier): tripling every interim dispatch would triple cost for the smallest-stakes verdicts, against MacNet's saturation evidence.

# Native fallback
/goal all rubric items in .ultragoal/goals/active/multiagent-orchestration/goal.md are checked with evidence and the verification log ends with ULTRAGOAL-VERIFIED: PASS, or stop after 35 turns

## Verification — 2026-06-11
| Rubric item | Command run | Result | Verdict |
|---|---|---|---|
| Memo ≥15 distinct links | `grep -oE 'https?://[^ )]+' docs/research/multiagent-orchestration-2026-06.md \| sort -u \| wc -l` | 45 | PASS |
| ≥4 community sections | `grep '^## ' docs/research/multiagent-orchestration-2026-06.md` | 6 headers; Anthropic, Practitioners, Chinese labs, Academia all present | PASS |
| Ranked-ideas table ≥8 rows | `awk '/^## Ranked ideas/,/^## Implemented/' … \| grep -c '^\| [0-9]'` | 12 data rows, each with a Leverage rationale column | PASS |
| Top idea end-to-end + Implemented mapping | `git diff --stat` + read memo `## Implemented` | Panel verification mapped idea→8 files→validation; all 8 named files differ from HEAD | PASS |
| Runner-up implemented | `git diff skills/goal/SKILL.md` | New "Size the fan-out" paragraph present; memo Implemented entry 2 names it | PASS |
| Engine healthy | `bash tests/gate-test.sh; claude plugin validate .; node --check installer/cli.mjs` | passed: 47 failed: 0 exit 0; "Validation passed"; node-check exit 0 | PASS |
| Gate/context change carries new tests | `git diff tests/gate-test.sh` + suite run | goal-gate.sh diff non-empty; 6 new panel check calls (17→23 in-file); 47 > 41; session-context.sh diff empty | PASS |
| research-foundations rows | `git diff docs/research-foundations.md` | +5/−1; rows for panel verification, verifier independence, fan-out sizing — each with sources | PASS |
| ≥3 rejected ideas in journal | `awk '/^# Decision journal/,0' goal.md \| grep -c 'rejected:'` | 5 | PASS |
| Constraint: no version bump/tag | `git for-each-ref refs/tags`; `grep '"version"' package.json .claude-plugin/plugin.json`; `git status` | no tags exist; both at 0.11.1, neither file modified | PASS |
| Constraint: fail-open intact | read `git diff scripts/goal-gate.sh` + full script | header invariant untouched; panel branch adds no `set -e`/exit paths; all greps `2>/dev/null`; budget auto-pause (exit 0) still bounds any block; unknown verify values still default to "on" | PASS |
| Constraint: always-on context ≤10 lines | `git diff scripts/session-context.sh \| wc -l` | 0 — untouched; panel protocol line appears only in panel-goal gate messages | PASS |
| Constraint: no classifier-domain vocabulary | `grep -inE 'exploit\|malware\|offensive\|bioweapon\|pathogen\|jailbreak\|weapon' memo` | exit 1, no matches; memo is orchestration/reliability vocabulary throughout | PASS |

ULTRAGOAL-VERIFIED: PASS rubric=1271038965

## Verification — 2026-06-11 (re-sign after VERIFIER box flip)
| Rubric item | Command run | Result | Verdict |
|---|---|---|---|
| Memo ≥15 distinct links | `grep -oE 'https?://[^ )]+' docs/research/multiagent-orchestration-2026-06.md \| sort -u \| wc -l` | 45 | PASS |
| ≥4 community sections | `grep '^## ' docs/research/multiagent-orchestration-2026-06.md` | 6 headers; Anthropic, Practitioners, Chinese labs, Academia present | PASS |
| Ranked-ideas table ≥8 rows | `awk '/^## Ranked ideas/,/^## Implemented/' … \| grep -c '^\| [0-9]'` | 12 | PASS |
| Top idea end-to-end + mapping | `git diff --stat` + memo `## Implemented` | Entry 1 maps panel verification → 8 files → validation; all 8 modified in working tree | PASS |
| Runner-up implemented | `git diff skills/goal/SKILL.md` | New "Size the fan-out" paragraph; memo Implemented entry 2 names it | PASS |
| Engine healthy | `bash tests/gate-test.sh; claude plugin validate .; node --check installer/cli.mjs` | passed: 47 failed: 0, exit 0; "Validation passed"; node-check exit 0 | PASS |
| Gate change carries new tests | `git diff tests/gate-test.sh` + suite run | 6 new panel `check` calls; 47 > 41; session-context.sh diff empty | PASS |
| research-foundations rows | `git diff docs/research-foundations.md` | +5/−1; rows for fan-out sizing, panel verification, verifier independence — each cites sources | PASS |
| ≥3 rejected ideas in journal | `grep -n 'rejected:' goal.md` | 5 genuine journal entries (lines 62–66); awk-count of 6 includes the verification-table row — quirk noted, threshold met either way | PASS |
| VERIFIER sign-off | this block | fresh independent verdict bound to the current (post-flip) rubric hash | PASS |
| Constraint: no version bump/tag | `git for-each-ref refs/tags \| wc -l`; `grep '"version"' package.json .claude-plugin/plugin.json` | 0 tags; both 0.11.1, neither file modified | PASS |
| Constraint: fail-open intact | read full `git diff scripts/goal-gate.sh` | no new exit paths or `set -e`; unknown verify values still default to "on"; greps `2>/dev/null`; panel branch only toggles verified/messaging | PASS |
| Constraint: always-on context ≤10 lines | `git diff --stat scripts/session-context.sh \| wc -l` | 0 — untouched; panel line appears only in gate messages | PASS |
| Constraint: no classifier-domain vocabulary | `grep -inE 'exploit\|malware\|offensive\|bioweapon\|pathogen\|jailbreak\|weapon\|virus\|attack vector' memo` | exit 1, no matches | PASS |

ULTRAGOAL-VERIFIED: PASS rubric=1351950032
