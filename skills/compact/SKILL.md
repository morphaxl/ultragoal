---
name: compact
description: Compact the ultragoal project memory — dedupe, merge, drop stale entries, refresh the index. Run every ~10 sessions (the session banner nudges when due).
---

Run a compaction pass over `.ultragoal/memory/` (facts.md, patterns.md, failures.md, MEMORY.md).

1. Read all memory files end to end.
2. **Merge** near-duplicates into the strongest single entry (keep the best evidence citation).
3. **Generalize**: specific observations sharing a cause become one rule with the specifics as examples; note which sessions verified it ("Verified: S2, S6, S11").
4. **Drop**: entries contradicted by the current repo state (check before deleting), `[UNVERIFIED]` hypotheses that no session has touched since they were written, and anything the repo/git history now records on its own.
5. **Re-verify cheaply where possible**: if a `[VERIFIED]` fact has a one-command check, run it; downgrade or delete on failure.
6. Rewrite `MEMORY.md` so the index exactly matches what remains — one line per entry, most-load-bearing first. Keep it well under 100 lines; the head of this file is injected into every session.
7. Reset the cadence counter: write `0` to `.ultragoal/memory/.sessions`.

Report: entries merged / generalized / dropped / re-verified, and the new index size. Memory should come out *smaller and sharper*, not summarized into mush — when in doubt between compressing an entry and keeping its specifics, keep the specifics that would change what a future session does.
