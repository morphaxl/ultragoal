---
name: compact
description: Lint and compact the ultragoal project memory — find contradictions and stale claims, merge duplicates, refresh the index. Run every ~10 sessions (the session banner nudges when due).
---

Run a lint-and-compact pass over `.ultragoal/memory/` (MEMORY.md, facts.md, patterns.md, failures.md).

**The cardinal rule: only the compiled layer (above the `---`) is ever rewritten. Evidence logs below the line are append-only history — never edit, reorder, or delete their lines.** Compaction that touches evidence is corruption, not cleanup.

## 1. Lint — triaged findings first

Read every file end to end, then report findings in three tiers before changing anything:

- **Errors** (fix now): compiled claims that contradict each other across files; compiled claims contradicted by *newer* evidence in any log; index lines pointing at entries that no longer exist; the same fact compiled in two places.
- **Warnings** (fix if cheap, else flag): `[VERIFIED]` claims whose evidence is old and whose subject area has changed since (check `git log` on the relevant paths); `[INFERRED]` entries no session has touched since they were written; entries the repo or git history now records on its own.
- **Info**: `[no data yet]` slots in MEMORY.md that sessions keep needing; areas with lots of evidence but no compiled rule yet.

## 2. Compact — above the line only

- **Merge** near-duplicate compiled claims into the strongest one, keeping the best provenance.
- **Generalize**: observations sharing a cause become one rule; cite the supporting evidence dates ("evidence: S2, S6, S11 below").
- **Re-verify cheaply**: if a `[VERIFIED]` claim has a one-command check, run it. Passes → refresh its date. Fails → rewrite the claim, append the contradicting run to the evidence log.
- **Downgrade honestly**: a claim that can't be re-verified and looks doubtful becomes `[INFERRED]`, not deleted. **Never silently promote `[INFERRED]` or `[READ]` to `[VERIFIED]`** — that laundering is exactly how a memory starts citing itself.
- **Archive, don't destroy**: compiled entries that are obsolete move to an `## Archived` subsection at the bottom of the compiled layer with a one-line reason; their evidence stays in the log untouched.
- Rewrite MEMORY.md's index so it exactly matches what remains — one line per entry, most load-bearing first, well under 100 lines.

## 3. Close out

Reset the cadence counter: write `0` to `.ultragoal/memory/.sessions`.

Report: Errors/Warnings/Info found, what was merged, generalized, re-verified, downgraded, archived, and the new index size. Memory should come out *smaller and sharper*, not summarized into mush — when in doubt between compressing an entry and keeping the specifics that would change what a future session does, keep the specifics.
