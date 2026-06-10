---
name: remember
description: Distill lessons from the current session or a finished goal into the project memory (.ultragoal/memory/). Used directly or as the final step of a goal loop.
argument-hint: [optional - what to remember]
---

Distill durable lessons into `.ultragoal/memory/`. Focus given by the user (may be empty — then review the whole session and any just-finished goal, especially its Decision journal and Verification log):

<focus>
$ARGUMENTS
</focus>

## Where things go

- `facts.md` — things verified true about this project (schemas, behaviors, invariants, tool quirks)
- `patterns.md` — approaches that worked, **with why they worked**
- `failures.md` — dead ends and wrong assumptions, so no future session repeats them
- `MEMORY.md` — the index: one line per entry, `- [topic-file] <one-line hook>`. This is what gets injected each session; keep it tight and current.

## Protocol

- One lesson per entry, with a one-line summary first. Record corrections and confirmed approaches alike, including why they mattered.
- Tag every entry: `[VERIFIED S<session-or-goal>]` when you can point to a command output or verifier verdict as evidence (cite it), `[UNVERIFIED]` when it's a strong hypothesis. Never upgrade a tag without new evidence.
- Don't save what the repo or git history already records — code structure, past diffs, things CLAUDE.md states. Save what was *non-obvious*: the thing you'd want the next session to know on minute one.
- Update an existing entry rather than creating a near-duplicate; delete entries that turned out to be wrong (a wrong [VERIFIED] fact is worse than no fact).
- Generalize where the evidence supports it: three specific observations that share a cause become one rule, with the specifics as examples.

When done, list for the user what was added, updated, or deleted — one line each.
