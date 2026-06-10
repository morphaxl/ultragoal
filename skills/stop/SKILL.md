---
name: stop
description: Stop the active ultragoal loop — archive the goal as abandoned (or paused) and release the gate.
argument-hint: [optional reason]
---

The user wants to stop the active goal loop. Reason given (may be empty):

<reason>
$ARGUMENTS
</reason>

1. Read `.ultragoal/goals/active.md`. If there is no active goal, say so and stop.
2. Ask one question (skip if the reason already makes it obvious): abandon for good, or pause to resume later?
   - **Pause**: set `status: paused`, leave the file in place. The SessionStart banner will surface it next time.
   - **Abandon**: set `status: abandoned`, append the reason and the date to the Decision journal, move the file to `.ultragoal/goals/archive/<slug>.md`, and append a row to `.ultragoal/stats.tsv` (tab-separated; header `date	slug	kind	outcome	turns	verifier_fails	budget` if the file is new): date, slug, kind, `abandoned`, turns used (`.ultragoal/goals/.turns`), FAIL-verdict count in the goal file, budget. If `.ultragoal/goals/queue/` has queued goals, mention the next one to the user.
3. Either way the gate releases immediately — no further turns are forced.
4. If meaningful work happened before the stop, offer to distill what was learned (especially dead ends — `failures.md` exists so the next attempt doesn't repeat them). If the user agrees, follow the `ultragoal:remember` protocol.
5. Confirm to the user: what was stopped, where the spec went, and what remains undone (honestly — audit against actual tool results, don't soften it).
