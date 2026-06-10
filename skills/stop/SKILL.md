---
name: stop
description: Stop the active ultragoal loop — archive the goal as abandoned (or paused) and release the gate.
argument-hint: [optional reason]
---

The user wants to stop the active goal loop. Reason given (may be empty):

<reason>
$ARGUMENTS
</reason>

1. Find this session's goal: the `.ultragoal/goals/active/<slug>/goal.md` whose `session:` matches the current session (or the legacy `.ultragoal/goals/active.md`). If more than one active goal exists across sessions, confirm which one to stop — default to this session's. If none, say so and stop.
2. Ask one question (skip if the reason already makes it obvious): abandon for good, or pause to resume later?
   - **Pause**: set `status: paused`, leave the directory in place. The SessionStart banner surfaces it next time the bound session starts.
   - **Abandon**: set `status: abandoned`, append the reason and the date to the Decision journal, move `goal.md` to `.ultragoal/goals/archive/<slug>.md`, remove the now-empty `active/<slug>/` directory, and append a row to `.ultragoal/stats.tsv` (tab-separated; header `date	slug	kind	outcome	turns	verifier_fails	budget` if the file is new): date, slug, kind, `abandoned`, turns used (the goal dir's `.turns`), FAIL-verdict count in the goal file, budget.
3. Either way the gate releases immediately — no further turns are forced.
4. If meaningful work happened before the stop, offer to distill what was learned (especially dead ends — `failures.md` exists so the next attempt doesn't repeat them). If the user agrees, follow the `ultragoal:remember` protocol.
5. Confirm to the user: what was stopped, where the spec went, and what remains undone (honestly — audit against actual tool results, don't soften it).
