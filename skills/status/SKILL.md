---
name: status
description: Show the current ultragoal state — active goal, rubric progress, turn budget, memory health.
---

Report the current ultragoal state for this project. Current data:

Active goal file:
```!
cat "${CLAUDE_PROJECT_DIR:-.}/.ultragoal/goals/active.md" 2>/dev/null || echo "(no active goal)"
```

Turns used: !`cat "${CLAUDE_PROJECT_DIR:-.}/.ultragoal/goals/.turns" 2>/dev/null || echo 0` · Sessions since last memory compaction: !`cat "${CLAUDE_PROJECT_DIR:-.}/.ultragoal/memory/.sessions" 2>/dev/null || echo 0` · Archived goals: !`ls "${CLAUDE_PROJECT_DIR:-.}/.ultragoal/goals/archive/" 2>/dev/null | wc -l | tr -d ' '` · Queued: !`ls "${CLAUDE_PROJECT_DIR:-.}/.ultragoal/goals/queue/" 2>/dev/null | wc -l | tr -d ' '`

Goal history (stats.tsv, most recent last):
```!
tail -10 "${CLAUDE_PROJECT_DIR:-.}/.ultragoal/stats.tsv" 2>/dev/null || echo "(no completed goals yet)"
```

Summarize for the user, leading with what matters:

- If a goal is **active**: its objective in one line, rubric progress (checked/total, which items remain), turns used vs budget, last verifier verdict if any, and how to bail out (`/ultragoal:stop`).
- If a goal is **paused**: why (read its Decision journal tail), and that setting `status: active` resumes it.
- If **no goal**: say so, and note `/ultragoal:goal <brief>` starts one.
- Memory: one line — how many entries the index lists, and whether compaction is due (≥10 sessions).
- History: if stats.tsv has 3+ rows, one trend line — are goals finishing within budget, and are verifier FAILs per goal trending down? (Rubric design is the skill; this is its scoreboard.)

Keep it short. Do not start working on the goal from this skill — it is a dashboard, not a trigger.
