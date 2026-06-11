---
name: setup
description: Initialize or reconfigure ultragoal in this project — scaffold .ultragoal/, choose preference knobs, wire the CLAUDE.md block. Runs automatically on first /ultragoal:goal.
---

Initialize (or reconfigure) ultragoal for this project. Takes about a minute.

## 1. Knobs

Ask the user the five questions below in **one** AskUserQuestion call (recommended default first). If `.ultragoal/config.md` already exists, show current values and ask only what they want changed. If running non-interactively, take all defaults.

1. **Action mode** — proactive (default) / conservative
2. **Communication** — lead-with-outcome (default) / detailed
3. **Scope discipline** — elaborate-ok, polish welcome (default) / minimal
4. **Memory sharing** — git-committed, team-shared (default) / local-only (gitignored)
5. **Verification** — on (default: a fresh-context verifier must sign off before a goal finishes) / off (checked rubric + saved lessons suffice; faster, less rigorous) / panel (strictest: final sign-off requires three parallel verifier lenses — mechanical re-run, adversarial refutation, constraints — all passing; fires once per goal at the final sign-off, about two extra verifier passes — pick it when the result matters more than the cost)

Three more settings with sensible defaults — mention they exist in `config.md` rather than asking: default turn budget (25), verification cadence (before claiming any rubric item), and interview depth (adaptive — the goal skill sizes the interview to the goal's stakes and length; "quick" forces one batch, "deep" forces multi-round).

**Workspace placement:** if this directory sits inside a larger workspace that holds several repos, offer to put `.ultragoal/` at the workspace root instead — the hooks walk up from the current repo to the nearest `.ultragoal/`, so one shared brain can serve all the nested repos.

## 2. Scaffold

Create (don't overwrite anything that exists):

```
.ultragoal/
├── config.md            ← from [config-template.md](config-template.md), with chosen knobs
├── goals/archive/.gitkeep
└── memory/
    ├── MEMORY.md        ← from [memory-templates.md](memory-templates.md)
    ├── facts.md         ←   "      (resolver header + compiled layer + evidence log)
    ├── patterns.md      ←   "
    └── failures.md      ←   "
```

If memory sharing = local-only, add `.ultragoal/memory/` to `.gitignore`. Either way add `.ultragoal/goals/active/*/.turns`, `.ultragoal/goals/active/*/.rubric-hash`, and `.ultragoal/memory/.sessions` to `.gitignore` (machine-local, per-session counters that shouldn't be shared).

## 3. CLAUDE.md block

Assemble the block from [claude-md-block.md](claude-md-block.md): the fixed memory/goal protocol plus the snippet for each chosen knob. Then:

- If the project's `CLAUDE.md` already has `<!-- ultragoal:start -->` markers, replace the content between them.
- Else append the block to `CLAUDE.md` (create the file if missing).
- Show the user the block before writing and confirm — it's their file.

## 4. Optional memory bootstrap

If this repo has history worth mining (existing docs, postmortems, devlogs, a long git log), offer once: "Want me to bootstrap memory from existing history? I'll use subagents to identify core themes and lessons and store them in `.ultragoal/memory/`." On yes: dispatch parallel subagents, one per source kind (git log for recurring fix patterns and reverted approaches; docs/postmortems for known gotchas; configs for non-obvious invariants), then file the distilled lessons per the `ultragoal:remember` protocol — tagged `[READ · source]` or `[INFERRED · confidence]`, never `[VERIFIED]` (nothing was re-run), each with an evidence line naming where it came from. A seeded memory starts the very first goal warm instead of cold.

Finish by confirming what was created and pointing at the next step: `/ultragoal:goal <brain dump>`.
