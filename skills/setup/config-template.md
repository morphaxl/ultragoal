# config.md template

Write `.ultragoal/config.md` in this shape, filling in the chosen values:

```markdown
# ultragoal config

Plain markdown, hand-editable. Skills read this file; re-run /ultragoal:setup to change knobs interactively.

| Knob | Value |
|---|---|
| action-mode | proactive \| conservative |
| communication | lead-with-outcome \| detailed |
| scope | minimal \| elaborate-ok |
| memory-sharing | git \| local |
| default-budget | 25 |
| verification-cadence | every-claim \| every-3-turns \| every-5-turns |

Notes:
- default-budget is the `budget:` a new goal spec starts with.
- verification-cadence controls when the goal loop dispatches the verifier subagent.
```
