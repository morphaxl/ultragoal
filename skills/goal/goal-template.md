# Goal spec template

Write `.ultragoal/goals/active.md` exactly in this shape. Frontmatter fields are read by the gate script — keep the key names.

```markdown
---
slug: <kebab-case-short-name>
status: active
budget: <max turns — default from .ultragoal/config.md, usually 25>
created: <YYYY-MM-DD>
---

# Objective
<One paragraph: the outcome, why it matters, and who/what it is for. Intent first —
the model performs better when it understands the reason, not only the request.>

# Context
<Distilled from the brief + interview + repo scan + memory: key constraints, prior art,
relevant files, links. List every assumption you made on the user's behalf.>

# Rubric
- [ ] <claim about the end state> — check: `<exact command>` <expected result>
- [ ] ...
- [ ] VERIFIER: independent sign-off recorded in the Verification log

# Stop conditions
- <turn budget> turns reached, or <item> fails verification 3 consecutive times
- <any domain-specific bail-out condition>

# Constraints
- <what must NOT change, each with a check the verifier can run>

# Verification log
<!-- only the ultragoal:verifier subagent appends here -->

# Decision journal
<!-- one line per structural decision or abandoned approach, as you work -->

# Native fallback
/goal <one-line condition restating the rubric, e.g. "all rubric items in .ultragoal/goals/active.md are checked with evidence and the verification log shows ULTRAGOAL-VERIFIED: PASS, or stop after N turns">
```

The Native fallback line lets anyone run this same goal with Claude Code's built-in `/goal` instead of the ultragoal gate (useful for one-off headless runs: `claude -p "/goal ..."`).
