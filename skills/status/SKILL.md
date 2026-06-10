---
name: status
description: Show the current ultragoal state — active goal, rubric progress, turn budget, memory health.
---

Report the current ultragoal state for this project. Current data:

Active goals (one directory per goal; each shows its bound session):
```!
for g in "${CLAUDE_PROJECT_DIR:-.}"/.ultragoal/goals/active/*/goal.md "${CLAUDE_PROJECT_DIR:-.}"/.ultragoal/goals/active.md; do [ -r "$g" ] || continue; echo "── $g"; grep -E '^(slug|status|kind|session|budget):' "$g"; t="$(dirname "$g")/.turns"; echo "turns: $(cat "$t" 2>/dev/null || echo 0)"; done 2>/dev/null || echo "(no active goals)"
```

Sessions since last memory compaction: !`cat "${CLAUDE_PROJECT_DIR:-.}/.ultragoal/memory/.sessions" 2>/dev/null || echo 0` · Archived goals: !`ls "${CLAUDE_PROJECT_DIR:-.}/.ultragoal/goals/archive/" 2>/dev/null | wc -l | tr -d ' '`

Goal history (stats.tsv, most recent last):
```!
tail -10 "${CLAUDE_PROJECT_DIR:-.}/.ultragoal/stats.tsv" 2>/dev/null || echo "(no completed goals yet)"
```

Summarize for the user, leading with what matters. Note which goal (if any) belongs to THIS session — that's the one the gate is driving here; others run in their own sessions.

- For each **active** goal: its objective in one line, rubric progress (checked/total, which items remain), turns used vs budget, last verifier verdict if any. Mark the current session's goal distinctly. Bail out with `/ultragoal:stop`.
- If a goal is **paused**: why (read its Decision journal tail), and that setting `status: active` resumes it.
- If **no goals**: say so, and note `/ultragoal:goal <brief>` starts one.
- Memory: one line — how many entries the index lists, and whether compaction is due (≥10 sessions).
- History: if stats.tsv has 3+ rows, one trend line — are goals finishing within budget, and are verifier FAILs per goal trending down? (Rubric design is the skill; this is its scoreboard.)

End with one dim line: preferences live in `.ultragoal/config.md` (hand-edit anytime) — re-run `/ultragoal:setup` to change them interactively.

Keep it short. Do not start working on the goal from this skill — it is a dashboard, not a trigger.
