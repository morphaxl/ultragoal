---
slug: harness-bench
status: active
kind: task
budget: 40
session: dac81d85-0391-4177-b6ec-c935b38ff5e4
verify: on
created: 2026-06-11
---

# Objective
Build ultragoal's self-measurement instrument and record the first baseline: a bench of seeded tasks run headless through two arms — ultragoal (goal loop + gate + verifier) vs vanilla Claude Code — graded on identical end-state checks, reporting rubric-pass rate, turns, and tokens per run. The product's pitch is "premium, results-first"; this goal converts that from claim to measured number, and the instrument becomes the frozen measure command for every future improvement ratchet.

# Context
- Owner ratified all four dials: instrument + baseline only (no improvement round); starter scale 18 runs (3 tasks × 2 arms × 3 reps); pin the harness with a plain local commit first; budget 40.
- kind: task by the experiment-guide's own rule — this goal BUILDS the measure command; nothing is ratcheted yet. Future goals arm `kind: experiment` against `bench/run.mjs` as their immutable measure.
- My calls: bench lives in `bench/` only — product engine (scripts/ skills/ agents/ hooks/ installer/) untouched this goal; agent runs happen in temp sandboxes outside the repo; each task's check must FAIL on the freshly seeded repo (a check that passes pre-work is broken); ultragoal arm runs `claude --plugin-dir <repo>` so the pinned working copy (panel feature included) is what's measured; vanilla arm gets the identical brief with no plugin; runner is zero-dependency node (matches installer style) parsing `claude -p --output-format json` for turns/tokens/cost.
- Honesty note: the gate enforcing THIS goal runs from the installed 0.11.1 plugin cache, which predates `verify: panel` — so this goal arms `verify: on`; the final sign-off will voluntarily dispatch the new three-lens panel as dogfood, but the enforced semantic is single-PASS.
- Cost posture (owner): don't trim reps; crashed runs are re-run and journaled. Scale, in countable units: ~20+ headless agent sessions (18 baseline + smoke), 2 research scouts, ~8 verifier dispatches + final panel.
- Local commits are allowed (the pinning commit is required); no version bump, tag, push, or release. Commit messages follow owner style (no assistant attribution).
- Machinery: 2 parallel research scouts (eval methodology, variance statistics); headless bench runs as background Bash with logs under this goal dir's logs/; verifier per claim.
- Risk concentration: headless `claude -p` + plugin-dir + non-interactive goal-skill flow inside a sandbox is the integration that may need debugging turns; smoke-test before the 18-run baseline.

# Rubric
- [x] Harness pinned: pending work committed; harness surface has no uncommitted diff — check: `git diff --stat HEAD -- scripts skills agents installer hooks` empty and `git status --porcelain -- scripts skills agents installer hooks` empty
  - evidence: both commands empty at HEAD e36367e; verifier confirmed (Verification log, items 1–3 PASS)
- [x] Methodology memo exists with ≥10 distinct primary-source links — check: `grep -oE 'https?://[^ )]+' docs/research/harness-eval-2026-06.md | sort -u | wc -l` ≥ 10
  - evidence: grep -> 21 distinct URLs; verifier confirmed 21 ≥ 10
- [x] 3 seeded tasks exist, each with setup, brief, and standalone end-state check that fails on the freshly seeded repo — check: `node bench/run.mjs --selftest` exits 0 and prints one PASS line per task
  - evidence: `node bench/run.mjs --selftest` -> exit 0; csv-stats 2/9→9/9, slugify 3/12→12/12, todo-json 4/7→7/7; verifier re-ran and confirmed
- [ ] Runner completes a paired smoke run and emits complete rows — check: smoke results TSV has header `task	arm	passes	checks	turns	tokens	model	harness_commit` and ≥2 data rows
- [ ] Baseline complete: 18 runs recorded — check: `awk 'NR>1' bench/results/baseline.tsv | wc -l` = 18 with all 3 tasks × both arms × 3 reps present
- [ ] bench/BASELINE.md summarizes per-task pass rate, turns, and tokens for both arms with spread, and records the pinned harness commit + model — check: file has the summary table and a hash that `git cat-file -t` confirms is a commit
- [ ] Engine untouched and healthy — check: `bash tests/gate-test.sh` exits 0 with ≥47 passed; `claude plugin validate .` passes; `node --check installer/cli.mjs` and `node --check bench/run.mjs` exit 0
- [ ] Re-run guide exists — check: bench/README.md contains the exact baseline re-run command and the methodology summary
- [ ] ≥3 rejected design decisions in the Decision journal with reasons — check: `awk '/^# Decision journal/,/^# Native fallback/' .ultragoal/goals/active/harness-bench/goal.md | grep -c 'rejected:'` ≥ 3
- [ ] VERIFIER: independent sign-off recorded in the Verification log

# Stop conditions
- 40 turns reached, or the same headless-integration blocker survives 3 consecutive debugging attempts (pause and report), or same item fails verification 3 consecutive times

# Constraints
- The bench never special-cases an arm: identical brief and identical check per task across arms — verifier reads bench/run.mjs and task definitions
- Product engine unchanged: `git diff <pin-commit> -- scripts skills agents hooks installer` stays empty for the life of the goal
- Agent sessions run only in temp sandboxes outside this repo — never against the product repo itself
- No version bump, tag, push, or release; local commits only
- Reps are never trimmed for cost; a crashed run is re-run and the crash journaled

# Verification log
<!-- only the ultragoal:verifier subagent appends here -->

# Decision journal
- 2026-06-11 owner ratified: instrument+baseline scope, 18-run starter scale, pin-first commit, budget 40.
- 2026-06-11 rejected: `--bare` flag for arm isolation — it refuses OAuth/keychain auth and this machine has no ANTHROPIC_API_KEY; vanilla arm instead = stock environment with no .ultragoal in the sandbox (installed plugin hooks are no-ops there), definition recorded in the memo.
- 2026-06-11 rejected: `--max-turns` run cap — flag doesn't exist in this CLI version; per-run wall-clock timeout (25 min, SIGKILL) + the ultragoal arm's own goal budget serve instead.
- 2026-06-11 rejected: shipping graders inside the seeded sandboxes — agents could read or game them (StrongDM lesson); check.sh lives in bench/tasks/ and runs against the sandbox from outside.
- 2026-06-11 rejected: rows for infrastructure failures — a crashed/unparseable run writes NO row and is re-run via single-run mode, keeping baseline.tsv a record of completed measurements only.

# Native fallback
/goal all rubric items in .ultragoal/goals/active/harness-bench/goal.md are checked with evidence and the verification log ends with ULTRAGOAL-VERIFIED: PASS, or stop after 40 turns

## Verification — 2026-06-11
Scope: interim verification of rubric items 1–3 only (items 4–10 not claimed, not graded). Goal remains incomplete.
| Rubric item | Command run | Result | Verdict |
|---|---|---|---|
| 1. Harness pinned | `git diff --stat HEAD -- scripts skills agents installer hooks` and `git status --porcelain -- scripts skills agents installer hooks` | both empty, exit 0; HEAD = e36367e (claimed pin commit) | PASS — harness surface clean at pin commit |
| 2. Methodology memo ≥10 links | `grep -oE 'https?://[^ )]+' docs/research/harness-eval-2026-06.md \| sort -u \| wc -l` | 21 distinct URLs (20 primary; one explicitly tagged secondary); memo is substantive, not a link dump | PASS — 21 ≥ 10 |
| 3. Selftest | `node bench/run.mjs --selftest` | exit 0; `SELFTEST csv-stats PASS (seed 2/9 fails, reference 9/9 passes)`, `SELFTEST slugify PASS (seed 3/12 fails, reference 12/12 passes)`, `SELFTEST todo-json PASS (seed 4/7 fails, reference 7/7 passes)` — one PASS line per task, all 3 fail-on-seed/pass-on-reference | PASS |
| Constraint: arm-neutral bench | read bench/run.mjs + all bench/tasks/*/check.sh; `grep -rinE 'ultragoal\|vanilla\|plugin\|claude\|arm' bench/tasks/` | no arm references in any task definition; identical brief/sandbox/grader per task, arms differ only in claudeArgs invocation per documented protocol | no violation |
| Constraint: engine unchanged | `git diff e36367e(HEAD) -- scripts skills agents hooks installer` | empty | no violation |

Note: bench/, docs/research/harness-eval-2026-06.md, and goal logs are currently untracked (outside the pinned harness surface — permitted; flagging for later items that reference the harness commit from results rows).

ULTRAGOAL-VERIFIED: PASS rubric=1613333547
