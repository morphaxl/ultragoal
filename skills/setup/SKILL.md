---
name: setup
description: Initialize or reconfigure ultragoal in this project — scaffold .ultragoal/, choose preference knobs, wire the CLAUDE.md block. Runs automatically on first /ultragoal:goal.
---

Initialize (or reconfigure) ultragoal for this project. Takes about a minute.

## 1. Knobs

Ask the user the seven questions below in **one** AskUserQuestion call (recommended default first). If `.ultragoal/config.md` already exists, show current values and ask only what they want changed. If running non-interactively, take all defaults.

1. **Rigor** — how much scaffolding the harness wraps around the model; match it to model strength. **vanilla** (default — for strong models like Fable: the lean single-grader loop, no extras) / **standard** (bells & whistles: interim re-checks, pessimistic double-runs, research scouts, the background log monitor) / **max** (every recommended technique, for lower-intelligence models or release-grade stakes: 3-lens panel verification, every-claim cadence, multi-modal scout sweeps, deep interview, rubric variants). The goal skill reads this and shapes the whole loop. This config value is only the *default*: the goal skill offers rigor as a per-run dial at arm time (beside the depth dial), and saying "max mode" / "vanilla" in a brief pre-answers it.
2. **Action mode** — proactive (default) / conservative
3. **Communication** — lead-with-outcome (default) / detailed
4. **Scope discipline** — elaborate-ok, polish welcome (default) / minimal
5. **Memory sharing** — git-committed, team-shared (default) / local-only (gitignored)
6. **Verification** — on (default: a fresh-context verifier must sign off before a goal finishes) / off (checked rubric + saved lessons suffice; faster, less rigorous). Note: rigor=max sets this to a 3-verifier panel automatically.
7. **Harness-feedback log** — off (default) / on. When on, and the user flags that the harness itself misbehaved, the model records a self-observation (which component failed, why, how to improve ultragoal) to a local `.ultragoal/harness-log.md`. Opt-in, local markdown only, never transmitted — sharing is user-initiated. On adds a small CLAUDE.md protocol snippet and seeds the log file; off adds nothing.

Five more settings with sensible defaults — mention they exist in `config.md` rather than asking: default budget (25 gate-checked turns — the standard depth tier; the goal skill asks depth per goal as quick ~10 / standard 25 / deep 60+), verification cadence (final — one verifier pass at sign-off; "every-claim" verifies before each box for stricter, costlier loops), interview depth (adaptive — the goal skill sizes the interview to the goal's stakes and length; "quick" forces one batch, "deep" forces multi-round), auto-update (on — the session hook refreshes the plugin pin in the background daily, since project-scoped installs never auto-update natively), and auto-memory (unified — Claude Code's native auto memory is redirected to `.ultragoal/memory` via `autoMemoryDirectory` in `.claude/settings.local.json`, so the repo has ONE memory brain instead of two; setup writes the key only if absent. "separate" opts out and keeps native memory as a personal machine-local store). When scaffolding with auto-memory unified, write the `autoMemoryDirectory` key (absolute path to this repo's `.ultragoal/memory`) into `.claude/settings.local.json`, merging with any existing JSON and never overwriting an existing key.

**Workspace placement:** if this directory sits inside a larger workspace that holds several repos, offer to put `.ultragoal/` at the workspace root instead — the hooks walk up from the current repo to the nearest `.ultragoal/`, so one shared brain can serve all the nested repos.

## 2. Scaffold

Create (don't overwrite anything that exists):

```
.ultragoal/
├── config.md            ← from [config-template.md](config-template.md), with chosen knobs
├── harness-log.md       ← ONLY if harness-log = on; from the template in [memory-templates.md](memory-templates.md)
├── goals/archive/.gitkeep
└── memory/
    ├── MEMORY.md        ← from [memory-templates.md](memory-templates.md)
    ├── facts.md         ←   "      (resolver header + compiled layer + evidence log)
    ├── patterns.md      ←   "
    └── failures.md      ←   "
```

Running non-interactively (no user present), scaffold the minimum instead: `config.md` and `memory/MEMORY.md` only — topic files get created by the remember protocol on first write, and a throwaway run that never writes memory shouldn't pay for empty templates.

If memory sharing = local-only, add `.ultragoal/memory/` to `.gitignore`. Either way add `.ultragoal/goals/active/*/.turns`, `.ultragoal/goals/active/*/.rubric-hash`, and `.ultragoal/memory/.sessions` to `.gitignore` (machine-local, per-session counters that shouldn't be shared).

## 3. CLAUDE.md block

Assemble the block from [claude-md-block.md](claude-md-block.md): the fixed memory/goal protocol plus the snippet for each chosen knob. Then:

- If the project's `CLAUDE.md` already has `<!-- ultragoal:start -->` markers, replace the content between them.
- Else append the block to `CLAUDE.md` (create the file if missing).
- Show the user the block before writing and confirm — it's their file. (Non-interactive: write the fixed core only, skip the per-knob snippets — defaults are already the skills' built-in behavior.)

## 4. Optional memory bootstrap

If this repo has history worth mining (existing docs, postmortems, devlogs, a long git log), offer once: "Want me to bootstrap memory from existing history? I'll use subagents to identify core themes and lessons and store them in `.ultragoal/memory/`." On yes: dispatch parallel subagents, one per source kind (git log for recurring fix patterns and reverted approaches; docs/postmortems for known gotchas; configs for non-obvious invariants), then file the distilled lessons per the `ultragoal:remember` protocol — tagged `[READ · source]` or `[INFERRED · confidence]`, never `[VERIFIED]` (nothing was re-run), each with an evidence line naming where it came from. A seeded memory starts the very first goal warm instead of cold.

Finish by confirming what was created and pointing at the next step: `/ultragoal:goal <brain dump>`.
