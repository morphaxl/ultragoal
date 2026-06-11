---
slug: harness-research
status: done
kind: task
budget: 30
session: 9416b919-c5bb-40b9-abcb-17346b172782
verify: on
created: 2026-06-11
---

# Objective
Mine the current frontier of agent-harness and model-behavior-control work — Anthropic research/blogs, AI-engineering practitioners, Chinese labs (DeepSeek, Alibaba/Qwen, Moonshot, ByteDance), and academic agent-systems research — for high-signal ideas that make ultragoal materially better, prioritizing the variables that determine outcome quality: richness of context and richness of feedback signal. Implement the top 3. For the product's users: better goals, tighter loops, less babysitting.

# Context
- Owner ratified: memo + top-3 implemented; blast radius = anything incl. gate (every gate change needs a test); no release without asking; budget 30.
- My calls: memo at docs/research/harness-research-2026-06.md; saturation stop; kind task.
- Machinery for this goal: parallel web-research subagents (one per community), second sweep on hot threads, pipelined verifier dispatch, Decision journal for rejects.
- This session already audited the Fable 5 prompting guide (all its leverage is implemented as of v0.11.1) — research must go BEYOND that guide.

# Rubric
- [x] Research memo exists with ≥15 distinct primary-source links — check: `grep -oE 'https?://[^ )]+' docs/research/harness-research-2026-06.md | sort -u | wc -l` ≥ 15
  - evidence: `grep -oE 'https?://[^ )]+' docs/research/harness-research-2026-06.md | sort -u | wc -l` -> 40 (turn 2)
- [x] Memo has a section per community, ≥4 of them (Anthropic / Practitioners / Chinese labs / Academia) — check: `grep -c '^## ' docs/research/harness-research-2026-06.md` ≥ 4 with those names present
  - evidence: `grep '^## ' docs/research/harness-research-2026-06.md` -> Anthropic|Practitioners|Chinese labs|Academia|Ranked ideas|Implemented (6 sections) (turn 2)
- [x] Ranked-ideas table with ≥8 candidates, each row carrying a leverage rationale — check: table under "## Ranked ideas" has ≥8 data rows
  - evidence: `awk '/## Ranked ideas/,/## Implemented/' ... | grep -c '^| [0-9]'` -> 10 rows (turn 2)
- [x] Top 3 ideas implemented; memo "## Implemented" section maps each idea → files changed → validation evidence — check: section lists 3 entries; named files differ from HEAD@arm in `git diff --stat`
  - evidence: `awk '/## Implemented/,0' | grep -c '^[0-9].'` -> 3; `git diff --stat HEAD -- <6 files>` -> 6 files changed, 43 insertions (turn 2)
- [x] Engine healthy: `bash tests/gate-test.sh` exits 0 (≥39 passed); `claude plugin validate .` passes; `node --check installer/cli.mjs` exits 0
  - evidence: `bash tests/gate-test.sh` -> passed: 41 failed: 0; `claude plugin validate .` -> Validation passed; `node --check installer/cli.mjs` -> exit 0 (turn 2)
- [x] If scripts/goal-gate.sh or scripts/session-context.sh changed, tests/gate-test.sh gained ≥1 case covering the change — check: both diffs non-empty together or both empty
  - evidence: `git diff HEAD -- scripts/goal-gate.sh | wc -l` -> 28; `git diff HEAD -- tests/gate-test.sh | wc -l` -> 15 (2 new evidence-ledger cases) (turn 2)
- [x] ≥3 rejected ideas logged in the Decision journal with a one-line why each — check: count journal lines marked "rejected:"
  - evidence: `grep -c 'rejected:' goal.md` -> 5 (turn 2)
- [x] VERIFIER: independent sign-off recorded in the Verification log
  - evidence: `grep 'ULTRAGOAL-VERIFIED' goal.md | tail -1` -> ULTRAGOAL-VERIFIED: PASS rubric=1028711716 (fresh-context verifier, turn 3)

# Stop conditions
- 30 turns reached, or 2 consecutive research rounds yield no new medium-or-higher-signal idea, or the same item fails verification 3 consecutive times

# Constraints
- No version bump, tag, or release — check: `git tag --contains HEAD` empty of new tags; no gh release calls
- Fail-open invariant intact in any script change — verifier reads the diff: every unexpected-state path exits 0
- Always-on context stays lean: net addition to per-session injected text (banner + CLAUDE.md core) ≤ 10 lines — verifier diffs session-context.sh output and FIXED_CORE

# Verification log

# Decision journal
- 2026-06-11: rejected: lessons→enforcement-artifacts (Hashimoto/OpenAI) — high conviction but belongs in a considered remember/compact rework, not a rider on this goal
- 2026-06-11: rejected: events.jsonl per-goal event log — real resume value, but needs size/rotation design; complexity not justified as a rider
- 2026-06-11: rejected: different-model verifier — strong evidence (cross-family verification), but it changes cost; owner decision via a knob, not a silent change
- 2026-06-11: rejected: budget-visibility tuning — evidence conflicts (Anthropic: visible budgets aid pacing; Cognition/R1: scarcity triggers corner-cutting); measure before touching the gate
- 2026-06-11: decision: implemented top-3 as ranked (evidence ledger, verifier hardening, rubric linter) — all prompt/gate-layer, every gate change tested

## Verification — 2026-06-11
| Rubric item | Command run | Result | Verdict |
|---|---|---|---|
| Memo ≥15 links | `grep -oE 'https?://[^ )]+' docs/research/harness-research-2026-06.md \| sort -u \| wc -l` | 40 | PASS — well above 15; memo read, links are primary sources |
| ≥4 community sections | `grep -n '^## ' docs/research/harness-research-2026-06.md` | Anthropic, Practitioners, Chinese labs, Academia (+2) | PASS — all four named communities present |
| Ranked table ≥8 rows | `awk '/^## Ranked ideas/,/^## Implemented/' ... \| grep -c '^\| [0-9]'` | 10 | PASS — each row carries a leverage rationale column |
| Top 3 implemented + mapping | `git diff --stat HEAD -- <6 named files>` | 6 files changed, 43 insertions | PASS — 3 entries map idea→files→validation; matches claim exactly. Note: 3 further files (session-context.sh, security-pass.md, setup/SKILL.md) are modified in-tree but outside the goal's claim and violate no constraint |
| Engine healthy | `bash tests/gate-test.sh`; `claude plugin validate .`; `node --check installer/cli.mjs` | passed: 41 failed: 0, exit 0; Validation passed; exit 0 | PASS — re-run fresh this verification |
| Gate change ⇒ test coverage | `git diff HEAD -- scripts/goal-gate.sh tests/gate-test.sh` | gate +10 lines (evidence nag); tests +2 cases (nag fires / suppressed with evidence) | PASS — session-context.sh change is prose-only and its branch is covered by existing case "ctx: remember nudge when memory empty" |
| ≥3 rejected ideas in journal | `grep -c '^- .*rejected:' goal.md` (journal lines counted manually) | 4 journal reject lines, each with a why | PASS — note: raw `grep -c 'rejected:'` self-inflates (matches the check/evidence lines themselves) |
| Constraint: no bump/tag/release | `git tag --contains HEAD` (empty locally); `gh release list`; `git diff HEAD -- package.json .claude-plugin/plugin.json` (0 lines) | latest release v0.11.1 = baseline HEAD, predates goal | PASS — no new tag, release, or version bump |
| Constraint: fail-open | read full diff of goal-gate.sh + session-context.sh; `grep -n 'exit ' scripts/goal-gate.sh` | new code is echo-only inside existing exit-2 block; awk result coerced to 0 on garbage; no exit path altered | PASS |
| Constraint: always-on ≤10 lines | `git diff HEAD -- scripts/session-context.sh installer/cli.mjs` | session-context: 1 line modified in place (net +0, conditional branch); installer/FIXED_CORE: 0-line diff | PASS — net always-on addition is 0 lines |

ULTRAGOAL-VERIFIED: PASS rubric=1028711716
- 2026-06-11: verifier findings actioned — anchored .gitignore `research/` to `/research/` so docs/research/ (the memo) is trackable; the three unclaimed in-tree changes (session-context wording, security-pass model note, setup bootstrap rewrite) predate this goal — they are the earlier Fable-5-guide analysis from this session, riding in the same working tree
