# Goal spec template

Write the spec to `.ultragoal/goals/active/<slug>/goal.md` exactly in this shape. Frontmatter fields are read by the gate script — keep the key names.

```markdown
---
slug: <kebab-case-short-name>
type: goal                     # Open Knowledge Format concept type (OKF v0.1 §4.1); makes the spec a valid OKF concept doc. The gate ignores it.
status: active                 # written as "draft" until the user arms it; the gate ignores drafts
kind: task | experiment        # experiment = measure-and-ratchet loop, see experiment-guide.md
budget: <max gate-checked turns, from the chosen depth tier — quick ~10 · standard 25 · deep 60+; default from .ultragoal/config.md>
session: <the arming session's ID — the gate enforces only this session's goal; another session can take it over by rewriting this field>
verify: on | off               # from config's verification knob; off = checked rubric suffices, no verifier pass
created: <YYYY-MM-DD>
---

# Objective
<One paragraph: the outcome, why it matters, and who/what it is for. Intent first —
the model performs better when it understands the reason, not only the request.
End by naming the difficulty class plainly — routine / hard / hardest-unsolved —
and instruct: scope the work like it's at the top of that range. Under-scoping
wastes the model's range the same way over-ceremony wastes tokens.>

# Context
<Distilled from the brief + interview + repo scan + memory: key constraints, prior art,
relevant files, links. List every assumption you made on the user's behalf.>

# Rubric
- [ ] <claim about the end state> — check: `<exact command>` <expected result>
- [ ] ...
- [ ] VERIFIER: independent sign-off recorded in the Verification log
<!-- when the worker checks a box, it appends an evidence line directly under it:
       - evidence: `command run` -> key output line (turn N)
     a checked box with no evidence line is an automatic verifier FAIL -->


# Stop conditions
- <budget> turns reached (the gate tracks this), or <item> fails verification 3 consecutive times
- <any domain-specific bail-out condition>

# Constraints
- <what must NOT change, each with a check the verifier can run>

# Measure   (experiment goals only)
- command: `<the immutable measure command>`
- baseline: <recorded after the first run, with run-to-run variance>
- in scope: <files the loop may edit>  /  out of scope: <the measure command, its data, tests>

# Verification log
<!-- only the ultragoal:verifier subagent appends here -->

# Decision journal
<!-- one line per structural decision or abandoned approach, as you work -->

# Native fallback
/goal <one-line condition restating the rubric, e.g. "all rubric items in this goal file are checked with evidence and the verification log shows ULTRAGOAL-VERIFIED: PASS, or stop after N turns">
```

Experiment goals keep their `results.tsv` in the same `active/<slug>/` directory, beside `goal.md`.

The Native fallback line lets anyone run this same goal with Claude Code's built-in `/goal` instead of the ultragoal gate (useful for one-off headless runs: `claude -p "/goal ..."`).
