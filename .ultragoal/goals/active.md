---
slug: audit-and-preference-defaults
status: active
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
- [ ] Plugin valid + loads: `claude plugin validate .` passes AND headless smoke test lists all 6 skills + verifier agent
- [ ] Installer default scope is project: fresh sandbox `node installer/cli.mjs --yes` results in plugin enabled in the sandbox repo's `.claude/settings.json`; `--global` flag installs user-scope
- [ ] Scope-discipline default is elaborate-ok in installer/cli.mjs, skills/setup/SKILL.md, and README knob table — check: grep shows polish-welcome listed first/recommended in all three
- [ ] Verification knob end to end: config row (installer + config-template), setup + installer ask it, goal skill copies `verify:` into spec frontmatter, gate skips verdict requirement when `verify: off` — check: gate tests cover off+unchecked (blocks) and off+checked (distill message, no verdict demanded)
- [ ] `bash tests/gate-test.sh` exits 0 with all existing and new cases
- [ ] Docs consistent: README knob table + install section reflect new defaults and the verification knob; config-template.md updated — check: no grep hits for the old defaults in those files
- [ ] v0.5.0 in both .claude-plugin/plugin.json and package.json; committed and pushed; `git status` clean
- [ ] VERIFIER: independent sign-off recorded below

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
