# ultragoal — maintainer guide

This repo is the **ultragoal** Claude Code plugin (goal loops: rubric-gated autonomy, fresh-context verification, growing memory) plus its `npx` installer. The repo doubles as its own plugin marketplace.

## Layout

```
.claude-plugin/   Claude plugin.json (manifest) + marketplace.json (self-hosting marketplace)
.agents/plugins/  Codex marketplace.json for the Codex-native bridge plugin
plugins/ultragoal-codex/  Codex plugin: skill + bundled hooks + Codex gate scripts
skills/           the skills: goal, status, stop, remember, compact, setup, verify
  goal/           flagship; supporting files: rubric-guide, experiment-guide, goal-template, rubrics/ (the rubric library)
agents/           verifier.md — the fresh-context verifier subagent (also the 3-lens panel at rigor=max)
hooks/hooks.json  Stop → goal-gate.sh; SessionStart → session-context.sh; PreToolUse(AskUserQuestion) → arm-guard.sh
monitors/monitors.json  on-skill-invoke:goal → goal-log-monitor.sh (standard/max rigor; self-disables in vanilla)
scripts/          goal-gate.sh (the loop engine) + session-context.sh + arm-guard.sh + goal-log-monitor.sh — POSIX shell, fail-open/fail-quiet
installer/cli.mjs the npx installer (clack TUI); the ONLY file shipped to npm
tests/gate-test.sh  the engine regression suite (run in CI)
```

**Rigor tiers (`rigor` config knob, default vanilla).** The gate understands only `verify: off|on|panel`; the goal skill reads `rigor` and expands it — vanilla = lean single-grader loop (today's behavior), standard = + interim checks/double-runs/scouts/monitor, max = `verify: panel` (3 mutually-blind lenses, all PASS) + every-claim + multi-modal sweeps + deep interview. Keep that separation: rigor never enters the gate.

State the plugin writes into a *user's* repo (`.ultragoal/`, CLAUDE.md block) is documented in README.md and DESIGN.md.

## Develop & test

- **Engine tests:** `bash tests/gate-test.sh` — must end `failed: 0`. The gate and its tests change together, always.
- **Rubric audit + Codex plugin tests:** `npm test` — covers `scripts/rubric-audit.mjs`, the pre-arm rubric linter for weak specs, and the Codex plugin metadata/hooks/runner docs.
- **Manifest valid:** `claude plugin validate .`
- **Smoke-test loading:** from another directory, `claude --plugin-dir <repo> -p "list ultragoal skills" --allowedTools ""` — expect 7 skills + the verifier.
- **Installer:** `node --check installer/cli.mjs`; full flow `node installer/cli.mjs --yes --setup` in a throwaway git repo.
- The live gate runs from the installed plugin **cache**, not the repo working copy — repo edits to `scripts/` take effect only after `claude plugin marketplace update ultragoal && claude plugin update ultragoal@ultragoal` (or a `--plugin-dir` run).

## Release & publish

**Publishing is automated. Do NOT run `npm publish` by hand** — a manual publish hits the account's 2FA passkey wall; CI publishes with an Automation token (the `NPM_TOKEN` repo secret) and a provenance attestation.

To cut a release:

1. Bump the version in **all** shipped manifests: `package.json`, `.claude-plugin/plugin.json`, and `plugins/ultragoal-codex/.codex-plugin/plugin.json` (keep them identical).
2. `bash tests/gate-test.sh && claude plugin validate .` — green.
3. Commit and push to `main`.
4. `gh release create vX.Y.Z --title "ultragoal vX.Y.Z" --latest --notes "<changes>"`.

Creating the release triggers `.github/workflows/publish.yml`, which: checks the release tag equals `package.json` version (fails fast if they drift), re-runs the gate suite, and runs `npm publish --provenance --access public`. The plugin marketplace (GitHub) updates from the pushed commit automatically; the npm package updates from the release. Verify with `npm view ultragoal version`.

CI also runs `tests/gate-test.sh`, the installer syntax check, and `npm pack --dry-run` on every push and PR (`.github/workflows/ci.yml`).

## Conventions

- Commit messages: imperative, no AI-tooling mentions or trailers.
- Skills state outcomes and protocols, not step-by-step scripts (over-prescriptive skills degrade Fable 5 output).
- `scripts/` stays POSIX shell and **fail-open** — the gate must never be able to trap a session; every new gate behavior gets a `tests/gate-test.sh` case.
- Files the Codex plugin ships as standalone copies (`rubric-audit.mjs`, `rubric-guide.md`, `qa-capability-map.md`) are guarded byte-identical by `tests/codex-sync.test.mjs`: edit the canonical file (repo `scripts/` or `skills/goal/`), then copy it over the `plugins/ultragoal-codex/` twin. The Codex runner's JS rubric hash must match the gate's shell hash byte-for-byte — `tests/codex-runner.test.mjs` computes the fixture hash with the gate's own pipeline, so a divergence fails tests.
- Dated thresholds in the rubric library (Play API levels, OWASP/WCAG versions, CWV numbers) carry a re-verify note; refresh them when they age.
