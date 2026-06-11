# Memory index

<!-- resolver: this is the index + fixed slots. One line per entry elsewhere; no entry
     bodies here. Its head is injected into every session — keep it under 100 lines. -->

## Commands
- test (gate engine): `bash tests/gate-test.sh` — 25 cases, must exit 0
- validate plugin: `claude plugin validate .`
- smoke-test loading: `claude --plugin-dir . -p "list ultragoal skills" --allowedTools ""` from another cwd
- installer sandbox test: temp git repo + `node <repo>/installer/cli.mjs --yes`

## Architecture invariants
[no data yet]

## Gotchas
- An apostrophe inside `${var:-default}` in double quotes corrupts bash parsing (broke session-context.sh once)
- clack `hint:` text renders inside parens — never put parens in hints
- When adding a knob, grep user-facing copy for hardcoded counts ("4 questions")
- gitignore patterns without leading `/` match at any depth — `git check-ignore` new doc dirs (shadowed docs/research/ once)
- rubric count-checks that grep the goal file self-match the rubric's own text — scope to the section

## Hot files
- `scripts/goal-gate.sh` ⇄ `tests/gate-test.sh` — change together, always
- `installer/cli.mjs` duplicates setup-skill templates (knob blocks, config, memory files) — keep in sync with `skills/setup/*`

## Index
- [facts.md] plugin-cache vs repo-copy during dogfooding; defaults as of v0.5.0
- [patterns.md] sandbox-install testing catches cache-only failures
