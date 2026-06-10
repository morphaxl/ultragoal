---
slug: goal-flow-dx-miniprompts
status: active
kind: task
budget: 15
session: e894758b-8746-4b0c-a91a-4733ac28dccc
verify: on
created: 2026-06-10
---

# Objective
Improve the goal-flow DX so users see a brief plan before the loop arms, can discover how to change knobs after install, and understand the verifier's isolation — and weave the official Fable 5 guide's unused mini-prompts into the skills/gate. Ship v0.7.0. Owner asked for this after dogfooding; these are the rough edges a new user hits first.

# Context
Owner confirmed: arm as specced; this repo's verification stays ON. Mini-prompts must stay verbatim/near-verbatim from the official guide (research/fable5-prompting-guide.md): the checkpoint block, the context-reassurance line, the re-grounding summary guidance.

# Rubric
- [ ] Goal skill Phase 4 instructs presenting a brief plan (3–6 bullets) with the spec before arming — check: grep -i "plan" skills/goal/SKILL.md shows it in Phase 4
- [ ] Checkpoint mini-prompt in the goal skill loop protocol — check: grep "ending on a promise" skills/goal/SKILL.md
- [ ] Context-reassurance line in the gate's autonomous footer — check: grep "ample context" scripts/goal-gate.sh
- [ ] Re-grounding summary guidance in the gate's final report step — check: grep "first look" scripts/goal-gate.sh
- [ ] README FAQ answers "change my knobs later?" and "does the verifier have its own context?" — check: grep both phrases in README.md
- [ ] /ultragoal:status prints how to change config — check: grep "setup" skills/status/SKILL.md
- [ ] bash tests/gate-test.sh exits 0 (25 cases) and claude plugin validate . passes
- [ ] v0.7.0 in plugin.json + package.json, committed, pushed, git status clean
- [ ] VERIFIER: independent sign-off recorded below

# Stop conditions
- 15 turns reached, or any item fails verification 3 consecutive times

# Constraints
- No behavior changes beyond the listed improvements
- Mini-prompts verbatim or near-verbatim from the official guide
- Commit messages mention no AI tooling

# Verification log

# Decision journal

# Native fallback
/goal all rubric items in .ultragoal/goals/active.md are checked with evidence and the last verification line is a PASS bound to the current rubric, or stop after 15 turns
