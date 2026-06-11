# config.md template

Write `.ultragoal/config.md` in this shape, filling in the chosen values:

```markdown
# ultragoal config

Plain markdown, hand-editable. Skills read this file; re-run /ultragoal:setup to change knobs interactively.

| Knob | Value |
|---|---|
| action-mode | proactive \| conservative |
| communication | lead-with-outcome \| detailed |
| scope | elaborate-ok \| minimal |
| memory-sharing | git \| local |
| verification | on \| off |
| default-budget | 25 |
| verification-cadence | final \| every-claim |
| interview-depth | adaptive \| quick \| deep |
| auto-update | on \| off |

Notes:
- verification off = goals finish on a fully checked rubric + distilled lessons, without the independent verifier pass. The goal skill copies this into each spec as `verify: on|off` (editable per goal).
- default-budget is the `budget:` a new goal spec starts with.
- verification-cadence: final (default) = one verifier pass at the sign-off, plus early dispatch for shaky or previously-failed items; every-claim = verify before checking each box — stricter and costlier.
- auto-update: on (default) = the SessionStart hook refreshes this repo's plugin pin in the background, at most once a day per machine, applying on the next session — project-scoped installs never auto-update natively. off = update only via npx ultragoal update.
- interview-depth: adaptive (default) = the goal skill sizes the interview to stakes × ambiguity × run length — one batch for small clear goals, multi-round for long/ambiguous/risky ones; quick = always one batch of up to ~5 questions; deep = always multi-round (intent → shape of done → scope edges → risks → verification). Saying "deep interview" or "quick" in a goal brief overrides it per-goal.
```
