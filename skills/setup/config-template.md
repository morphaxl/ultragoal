# config.md template

Write `.ultragoal/config.md` in this shape, filling in the chosen values:

```markdown
# ultragoal config

Plain markdown, hand-editable. Skills read this file; re-run /ultragoal:setup to change knobs interactively.

| Knob | Value |
|---|---|
| rigor | vanilla \| standard \| max |
| action-mode | proactive \| conservative |
| communication | lead-with-outcome \| detailed |
| scope | elaborate-ok \| minimal |
| memory-sharing | git \| local |
| verification | on \| off |
| harness-log | off \| on |
| default-budget | 25 |
| verification-cadence | final \| every-claim |
| interview-depth | adaptive \| quick \| deep |
| auto-update | on \| off |

Notes:
- rigor (default vanilla) scales how much scaffolding the harness wraps around the model — match it to model strength. It is a meta-knob: the goal skill reads it and chooses the loop's shape; the individual knobs below override it when set explicitly.
  - **vanilla** — for strong models (Fable-class). The article's pure loop: one fresh-context verifier at the final sign-off, no scouts, adaptive interview, no background monitor. This is exactly the default behavior and adds nothing extra.
  - **standard** — bells and whistles: single verifier plus interim re-checks on shaky/previously-failed items, pessimistic double-runs near thresholds, 2–4 research scouts for read-heavy work, and the background log monitor. Modest extra cost.
  - **max** — every recommended technique, for lower-intelligence models or release-grade stakes: 3-lens PANEL verification (`verify: panel` — checks/refute/constraints, all must PASS), every-claim cadence, multi-modal scout sweeps + a completeness critic, deep interview, rubric variants offered, and the monitor. Several-times the verifier cost; buys redundancy a weak model needs.
  - Override per goal by saying "max mode" / "vanilla" in the brief (same as interview-depth's quick/deep). Research behind the tiers: docs/research-foundations.md (aspect-lens ensembles, guard-agent mid-trajectory checks, 2–3-judge saturation).
- verification off = goals finish on a fully checked rubric + distilled lessons, without the independent verifier pass. The goal skill copies this into each spec as `verify: on|off|panel` (editable per goal; panel is set by rigor=max).
- harness-log (default off) = opt-in meta-learning about the *plugin*. When on, and the user flags that the harness itself misbehaved (a bad default, a misleading question, a missing check, ceremony where none was needed, a gate misfire), the model appends a self-observation to `.ultragoal/harness-log.md` — which component failed, why, and how ultragoal could change to prevent the class. Local markdown only; never transmitted; sharing is user-initiated. On enables a small CLAUDE.md protocol snippet; off adds nothing. Distinct from project memory (harness shortcomings here; project dead ends in failures.md; project facts in `[USER-CORRECTION]`).
- default-budget is the `budget:` a new goal spec starts with — max gate-checked turns. The goal skill asks it per goal as a depth tier — quick pass (~10) · standard (25) · deep (60+) — and writes the chosen cap into the spec.
- verification-cadence: final (default) = one verifier pass at the sign-off, plus early dispatch for shaky or previously-failed items; every-claim = verify before checking each box — stricter and costlier.
- auto-update: on (default) = the SessionStart hook refreshes this repo's plugin pin in the background, at most once a day per machine, applying on the next session — project-scoped installs never auto-update natively. off = update only via npx ultragoal update.
- interview-depth: adaptive (default) = the goal skill sizes the interview to stakes × ambiguity × run length — one batch for small clear goals, multi-round for long/ambiguous/risky ones; quick = always one batch of up to ~5 questions; deep = always multi-round (intent → shape of done → scope edges → risks → verification). Saying "deep interview" or "quick" in a goal brief overrides it per-goal.
```
