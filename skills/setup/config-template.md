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
| verification | on \| off \| panel |
| default-budget | 25 |
| verification-cadence | final \| every-claim |
| interview-depth | adaptive \| quick \| deep |

Notes:
- verification off = goals finish on a fully checked rubric + distilled lessons, without the independent verifier pass; panel = the final sign-off needs three parallel verifier lenses, for exceptional stakes. The goal skill copies this into each spec as `verify: on|off|panel` (editable per goal).
- default-budget is the `budget:` a new goal spec starts with.
- verification-cadence: final (default) = one verifier pass at the sign-off, plus early dispatch for shaky or previously-failed items; every-claim = verify before checking each box — stricter and costlier.
- interview-depth: adaptive (default) = the goal skill sizes the interview to stakes × ambiguity × run length — one batch for small clear goals, multi-round for long/ambiguous/risky ones; quick = always one batch of up to ~5 questions; deep = always multi-round (intent → shape of done → scope edges → risks → verification). Saying "deep interview" or "quick" in a goal brief overrides it per-goal.
```
