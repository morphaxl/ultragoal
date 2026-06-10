---
name: verify
description: Independent audit of a goal — the active one or a named archived goal. A fresh-context verifier re-runs every rubric check and tries to refute the work. Use after completion for extra assurance, or anytime you doubt the claims.
argument-hint: [optional - archived goal slug, or blank for the active/most recent goal]
---

Run an independent audit. Target (may be empty — then audit `.ultragoal/goals/active.md`, or if none exists, the most recently archived goal):

<target>
$ARGUMENTS
</target>

1. Resolve the goal file: active goal → `.ultragoal/goals/active.md`; a slug → `.ultragoal/goals/archive/<slug>.md`; empty + no active goal → newest file in `archive/`.
2. **Do not pre-investigate, summarize the work, or characterize the goal first** — anything you add becomes context that anchors the auditor. Dispatch the `ultragoal:verifier` subagent immediately, telling it only the goal file path and that this is a post-hoc audit: re-run every rubric check command, test every constraint, and append its verdict to the goal file per its protocol.
3. Relay the verdict to the user **verbatim-faithfully**: verdict first, then the per-item findings exactly as the verifier reported them. Do not soften failures or add reassurance the verifier didn't give.
4. If the audit FAILS on a goal that was marked done: say plainly which claims didn't hold, and offer two paths — reopen the goal (move it back to `active.md`, set `status: active` and `session:` to this session, uncheck the failed items) or record the gap as a known issue in `.ultragoal/memory/failures.md`.
5. If it fails on an *active* goal, the loop self-corrects — the gate will keep the session working; just make sure the failed items get unchecked.

For **maximum isolation** on high-stakes work (the in-session verifier still shares your Claude Code process and permissions), tell the user they can run the audit as a completely separate headless session from their terminal:

```bash
claude -p "Use the ultragoal:verify skill to audit the goal '<slug>'" --permission-mode acceptEdits
```

A verifier in a fresh process has seen none of this session's narrative — the strongest fresh-eyes guarantee available.
