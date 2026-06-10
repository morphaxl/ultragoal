---
slug: goal-flow-dx-miniprompts
status: done
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
- [x] Goal skill Phase 4 instructs presenting a brief plan (3–6 bullets) with the spec before arming — check: grep -i "plan" skills/goal/SKILL.md shows it in Phase 4
- [x] Checkpoint mini-prompt in the goal skill loop protocol — check: grep "ending on a promise" skills/goal/SKILL.md
- [x] Context-reassurance line in the gate's autonomous footer — check: grep "ample context" scripts/goal-gate.sh
- [x] Re-grounding summary guidance in the gate's final report step — check: grep "first look" scripts/goal-gate.sh
- [x] README FAQ answers "change my knobs later?" and "does the verifier have its own context?" — check: grep both phrases in README.md
- [x] /ultragoal:status prints how to change config — check: grep "setup" skills/status/SKILL.md
- [x] bash tests/gate-test.sh exits 0 (25 cases) and claude plugin validate . passes
- [x] v0.7.0 in plugin.json + package.json, committed, pushed, git status clean
- [x] VERIFIER: independent sign-off recorded below

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

## Verification — 2026-06-10
| Rubric item | Command run | Result | Verdict |
|---|---|---|---|
| Phase 4 plan before arming | `grep -i plan skills/goal/SKILL.md` + read Phase 4 | "The plan, briefly — 3–6 bullets" shown with draft spec before arming | PASS |
| Checkpoint mini-prompt in loop protocol | `grep "ending on a promise" skills/goal/SKILL.md` | line 78, verbatim match to guide lines 79–81 | PASS |
| Context-reassurance in autonomous footer | `grep "ample context" scripts/goal-gate.sh` | line 156, near-verbatim from guide line 158, in blocked-turn footer | PASS |
| Re-grounding guidance in final report step | `grep "first look" scripts/goal-gate.sh` | line 167, step 4 of release block, near-verbatim from guide lines 180–185 | PASS |
| README FAQ: knobs + verifier context | `grep -in "setup answers later\|verifier have its own context" README.md` + accuracy checks | both entries present (lines 158, 160); verifier agent tools = Read, Grep, Glob, Bash (no Edit); verify skill documents headless variant (line 19); config knobs editable, verify copied at arm time | PASS — note: literal phrase "change my knobs later" absent; heading is "How do I change my setup answers later?", which answers the question |
| Status prints config pointer | `grep -n setup skills/status/SKILL.md` | line 28: config.md hand-edit + /ultragoal:setup | PASS |
| Tests + plugin validate | `bash tests/gate-test.sh`; `claude plugin validate .` | passed: 25 failed: 0, EXIT=0; Validation passed, EXIT=0 | PASS |
| v0.7.0, committed, pushed, clean | `grep version *.json`; `git status --porcelain`; `git ls-remote origin main` | 0.7.0 in both; porcelain empty; HEAD fb36968 == origin/main | PASS |
| Constraints | `git diff 83a866d fb36968`; `git log -1 --format=%B` | diff scoped to listed improvements only; commit message mentions no AI tooling, no trailers | PASS |

ULTRAGOAL-VERIFIED: PASS rubric=3669510257
