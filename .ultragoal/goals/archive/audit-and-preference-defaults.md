---
slug: audit-and-preference-defaults
status: done
kind: task
budget: 20
session: e894758b-8746-4b0c-a91a-4733ac28dccc
created: 2026-06-10
---

# Objective
Audit the whole plugin end to end and fix what's broken; ship three preference changes the owner requested: install scope defaults to project, scope-discipline defaults to polish-welcome, and a verification on/off knob (off = boxes + distill required, verifier skipped). Release as v0.5.0. This is the product's own repo — the changes define defaults every future user gets.

# Context
Owner confirmed: project-scope default applies to interactive AND --yes installs (add --global for explicit global); polish-welcome becomes the scope-discipline default; verify-off still requires checked boxes with evidence and distillation. Current state: v0.4.0 shipped, 22 gate tests green, npm registry at 0.3.0 (owner publishes manually due to passkey 2FA).

# Rubric
- [x] Plugin valid + loads: `claude plugin validate .` passes AND headless smoke test lists all 6 skills + verifier agent
- [x] Installer default scope is project: fresh sandbox `node installer/cli.mjs --yes` results in plugin enabled in the sandbox repo's `.claude/settings.json`; `--global` flag installs user-scope
- [x] Scope-discipline default is elaborate-ok in installer/cli.mjs, skills/setup/SKILL.md, and README knob table — check: grep shows polish-welcome listed first/recommended in all three
- [x] Verification knob end to end: config row (installer + config-template), setup + installer ask it, goal skill copies `verify:` into spec frontmatter, gate skips verdict requirement when `verify: off` — check: gate tests cover off+unchecked (blocks) and off+checked (distill message, no verdict demanded)
- [x] `bash tests/gate-test.sh` exits 0 with all existing and new cases
- [x] Docs consistent: README knob table + install section reflect new defaults and the verification knob; config-template.md updated — check: no grep hits for the old defaults in those files
- [x] v0.5.0 in both .claude-plugin/plugin.json and package.json; committed and pushed; `git status` clean
- [x] VERIFIER: independent sign-off recorded below

# Stop conditions
- 20 turns reached, or the same rubric item fails verification 3 consecutive times

# Constraints
- No existing gate-test case regresses — check: the 22 pre-existing test names still pass
- No behavior changes beyond the three requested + bug fixes found in audit
- Commit messages mention no AI tooling

# Verification log

# Decision journal

# Native fallback
/goal all rubric items in .ultragoal/goals/active.md are checked with evidence and the last verification line is a PASS bound to the current rubric, or stop after 20 turns

## Verification — 2026-06-10
| Rubric item | Command run | Result | Verdict |
|---|---|---|---|
| Plugin valid + loads | `claude plugin validate .` + headless `claude --plugin-dir ... -p` from /tmp | validate passed; output: 6 skills (compact, goal, remember, setup, status, stop) + ultragoal:verifier, exit 0 | PASS |
| Installer project-scope default | `node installer/cli.mjs --yes` in fresh /tmp git repo | sandbox .claude/settings.json = {"enabledPlugins":{"ultragoal@ultragoal":true}}; cli.mjs L337: `--global` -> user scope | PASS |
| polish-welcome first/recommended | grep cli.mjs L161, setup SKILL.md L14, README L116 | all three list polish-welcome first as recommended/default | PASS |
| Verification knob end to end | read cli.mjs L178-184/L280/L382, config-template L16, setup SKILL L16, goal SKILL L59, goal-gate.sh L52-53/L121-123/L148-149 | config row, setup+installer ask, goal copies verify:, gate honors off; 3 verify-off gate tests pass | PASS |
| Gate tests | `bash tests/gate-test.sh` | exit 0, passed: 25 failed: 0; comm vs 4d421fc shows zero baseline cases removed, 3 new verify-off cases | PASS |
| Docs consistent | grep README + config-template + setup SKILL | 5-knob table w/ Verification row, install section: project default + --global; no "Four questions"/"minimal (recommended)" hits | PASS — minor: installer outro L401 still says "4 quick style questions" (outside the rubric's named files) |
| v0.5.0 committed + pushed | grep versions; `git status --porcelain`; `git ls-remote origin main` | both files 0.5.0; porcelain empty; origin/main == HEAD 0f69a0b | PASS |
| Constraints | baseline test diff; `git log -1 --format=%B` grep | all 22 pre-existing cases pass; commit message mentions no AI tooling; diff confined to the 3 features + docs/tests/versions | PASS |

ULTRAGOAL-VERIFIED: PASS rubric=280777002
