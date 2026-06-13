---
name: remember
description: Distill lessons from the current session or a finished goal into the project memory (.ultragoal/memory/). Used directly, as the final step of a goal loop, and immediately whenever the user corrects you.
argument-hint: [optional - what to remember]
---

Distill durable lessons into `.ultragoal/memory/`. Focus given by the user (may be empty — then review the whole session and any just-finished goal, especially its Decision journal and Verification log):

<focus>
$ARGUMENTS
</focus>

## The two layers — never mix them

Every memory file has two layers separated by `---`:

- **Above the line — compiled truth.** The current understanding, rewritten freely as it improves. This is what future sessions read first.
- **Below the line — evidence log.** Append-only, dated, never rewritten or deleted. One self-contained line per observation: `[YYYY-MM-DD S<n>] <what was observed and how>`.

Synthesis can be wrong; evidence can't. When you update a compiled claim, the evidence that justified the old version stays in the log. Anyone can re-derive the truth from below the line — that's the point.

## Where things go

Each file's header says what belongs in it and what doesn't — read it before filing. The short version:

- `facts.md` — what is *true of this repo* (schemas, behaviors, invariants, tool quirks)
- `patterns.md` — *reusable approaches* that worked here, with why they worked
- `failures.md` — *dead ends*: what was tried, why it failed, what to do instead
- `MEMORY.md` — the index and the fixed slots (commands, invariants, gotchas, hot files). Fill `[no data yet]` slots as you learn; keep one index line per entry. Its head is injected into every session — keep it tight.

Unsure where something goes? File the evidence line in the closest file and flag it in the index rather than inventing a new home. The same fact living in two places is how agents stop trusting the system.

**One thing that does NOT go in project memory:** a shortcoming of the *harness itself* (a bad ultragoal default, a misleading interview question, a missing rubric check, a gate misfire). If the `harness-log` knob is on, that belongs in `.ultragoal/harness-log.md` — a self-observation about improving the plugin — not in facts/patterns/failures, which are about *this repo*. A project dead end is still `failures.md`; a user correction about the project is still `[USER-CORRECTION]` in memory; only "the harness should change" goes to the harness log.

## Provenance — every compiled claim carries how it's known

```
[VERIFIED S4 · ran: pnpm test · 2026-06-10]   you (or the verifier) executed a command and saw it
[READ S2 · docs/auth.md]                      a source said it; the source could be stale
[INFERRED S5 · medium]                        you concluded it; it has never been directly checked
[USER-CORRECTION · 2026-06-10]                the user told you; highest confidence there is
```

Rules:

- Never upgrade a tag without new evidence, and **never let synthesis launder INFERRED into unqualified fact** — confident prose is indistinguishable from verified truth once written down, so the tag is the only thing keeping the two apart.
- A wrong `[VERIFIED]` claim is worse than no claim: if evidence contradicts one, fix it above the line and append the contradicting evidence below.
- **User corrections are written immediately, the moment they happen** — not batched to the end of the goal. They override everything, they're the highest-confidence signal you will ever receive, and they die with the session if you defer them.

## What to save

- One lesson per entry, one-line summary first; record corrections *and* confirmed approaches, including why they mattered.
- Expensive derivations you'd hate to redo — a traced data flow, a debugged race, a mapped dependency — file them the moment you finish deriving them; they shouldn't evaporate into chat history.
- Don't save what the repo or git history already records. Save the *non-obvious*: what you'd want the next session to know on minute one.
- Generalize when evidence supports it: three observations sharing a cause become one compiled rule, with the evidence lines still below the line, each dated.

When done, list for the user what was added, updated, or deleted — one line each.
