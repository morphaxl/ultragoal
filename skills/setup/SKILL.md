---
name: setup
description: Initialize or reconfigure ultragoal in this project — scaffold .ultragoal/, choose preference knobs, wire the CLAUDE.md block. Runs automatically on first /ultragoal:goal.
---

Initialize (or reconfigure) ultragoal for this project. Takes about a minute.

## 1. Knobs

Ask the user the four questions below in **one** AskUserQuestion call (recommended default first). If `.ultragoal/config.md` already exists, show current values and ask only what they want changed. If running non-interactively, take all defaults.

1. **Action mode** — proactive (default) / conservative
2. **Communication** — lead-with-outcome (default) / detailed
3. **Scope discipline** — minimal (default) / elaborate-ok
4. **Memory sharing** — git-committed, team-shared (default) / local-only (gitignored)

Two more settings with sensible defaults — mention they exist in `config.md` rather than asking: default turn budget (25) and verification cadence (before claiming any rubric item).

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

If memory sharing = local-only, add `.ultragoal/memory/` to `.gitignore`. Either way add `.ultragoal/goals/.turns` and `.ultragoal/memory/.sessions` to `.gitignore` (machine-local counters).

## 3. CLAUDE.md block

Assemble the block from [claude-md-block.md](claude-md-block.md): the fixed memory/goal protocol plus the snippet for each chosen knob. Then:

- If the project's `CLAUDE.md` already has `<!-- ultragoal:start -->` markers, replace the content between them.
- Else append the block to `CLAUDE.md` (create the file if missing).
- Show the user the block before writing and confirm — it's their file.

## 4. Optional memory bootstrap

If this repo has history worth mining (existing docs, old Claude transcripts, a long git log), offer once: "Want me to bootstrap memory from existing history? I'll use subagents to identify core themes and lessons and store them in `.ultragoal/memory/`." Run it only if they say yes, following the `ultragoal:remember` protocol with `[UNVERIFIED]` tags for anything not directly checkable.

Finish by confirming what was created and pointing at the next step: `/ultragoal:goal <brain dump>`.
