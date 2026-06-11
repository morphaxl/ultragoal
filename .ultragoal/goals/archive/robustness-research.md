---
slug: robustness-research
status: abandoned
kind: task
budget: 30
session: 9416b919-c5bb-40b9-abcb-17346b172782
verify: on
created: 2026-06-11
---

# Objective
Research the failure path of autonomous agent loops — failure taxonomies, recovery/resume engineering, context & instruction integrity under autonomy, and check-flakiness/determinism — and implement the top 3 ideas that make ultragoal robust to the ways long runs actually die. For users running `npx ultragoal run` overnight: the loop should survive crashes, stay anchored to its own goal and rubric when it ingests large or conflicting external content, and never let a flaky check corrupt the feedback signal.

# Context
- Owner delegated tangent choice; ratified same contract as harness-research: memo + top-3 implemented, anything-with-tests, no release unasked, budget 30.
- My calls: memo at docs/research/robustness-research-2026-06.md; four research themes (taxonomies, reliability practice, context-and-instruction integrity, flakiness/recovery); journal-count check scoped to its section (lesson from harness-research: self-matching greps inflate).
- SCOPED OUT — offensive-security / prompt-injection deep-dive: Fable 5's safety classifiers target offensive cybersecurity and false-positive on benign defensive work (per the Prompting Claude Fable 5 guide); a scout in that register switched this session to Opus 4.8 mid-run. The instruction-integrity concern is kept here in a reliability/provenance framing with no attack vocabulary; a dedicated security-hardening pass belongs in its own goal on Opus 4.8, mirroring the security-pass.md rubric template's model note.
- Machinery: 4 parallel research subagents, pipelined verifier, Decision journal for rejects.
- Prior art: docs/research/harness-research-2026-06.md deferred items 5 (events.jsonl resume log) and 7 (budget-visibility) may resurface here with stronger evidence — re-rank them with the new findings rather than auto-implementing.

# Rubric
- [ ] Research memo exists with ≥15 distinct primary-source links — check: `grep -oE 'https?://[^ )]+' docs/research/robustness-research-2026-06.md | sort -u | wc -l` ≥ 15
- [ ] Memo has ≥4 themed sections (failure taxonomies / reliability practice / context & instruction integrity / flakiness & recovery) — check: `grep -c '^## ' docs/research/robustness-research-2026-06.md` ≥ 4 with those themes present
- [ ] Ranked-ideas table with ≥8 candidates carrying leverage rationale — check: table under "## Ranked ideas" has ≥8 data rows
- [ ] Top 3 ideas implemented; memo "## Implemented" maps each idea → files → validation — check: section lists 3 entries; named files differ from HEAD in `git diff --stat`
- [ ] Engine healthy — check: `bash tests/gate-test.sh` exits 0 with ≥41 passed; `claude plugin validate .` passes; `node --check installer/cli.mjs` exits 0
- [ ] Any change to scripts/goal-gate.sh or scripts/session-context.sh has ≥1 new test case — check: both diffs non-empty together or both empty
- [ ] ≥3 rejected ideas in the Decision journal with reasons — check: `awk '/^# Decision journal/,0' <goal file> | grep -c 'rejected:'` ≥ 3
- [ ] VERIFIER: independent sign-off recorded in the Verification log

# Stop conditions
- 30 turns reached, or 2 consecutive research rounds with no new medium+ idea, or same item fails verification 3 consecutive times

# Constraints
- No version bump, tag, or release — check: no new git tags; manifest version unchanged
- Fail-open invariant intact in any script change — verifier reads the diff
- Always-on context net addition ≤ 10 lines — verifier diffs banner output and FIXED_CORE

# Verification log

# Decision journal
- 2026-06-11 abandoned: owner reports the bound session is not working; killed from session dac81d85 to free the tree for the multiagent-orchestration goal. No rubric items completed; research themes (failure taxonomies, resume, flakiness) remain open for a future goal.
