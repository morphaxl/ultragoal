# CLAUDE.md block assembly

The block is the fixed core + one snippet per chosen knob. All knob snippets are verbatim from Anthropic's official Fable 5 prompting guide and prompting best practices. Keep the final block under ~60 lines.

## Fixed core (always included)

```markdown
<!-- ultragoal:start — managed block; edit knobs via /ultragoal:setup or by hand -->
## Memory & goals (ultragoal)

- Before substantial work, consult `.ultragoal/memory/MEMORY.md` and the relevant topic files. Trust `[VERIFIED]` facts; re-check `[UNVERIFIED]` ones before relying on them.
- When you learn something durable — a correction, a confirmed approach, a dead end — record it per the memory protocol (the `ultragoal:remember` skill). Don't save what the repo or git history already records; update entries rather than duplicating; delete entries that prove wrong.
- Active goals live in `.ultragoal/goals/active.md`. Never check a rubric box without evidence from a command run this session, and never self-certify the VERIFIER item — that sign-off belongs to the fresh-context verifier subagent.
- Before reporting progress, audit each claim against a tool result from this session. If tests fail, say so with the output; if a step was skipped, say that.
```

## Knob: action-mode = proactive

```markdown
<default_to_action>
By default, implement changes rather than only suggesting them. If the user's intent is unclear, infer the most useful likely action and proceed, using tools to discover any missing details instead of guessing.
</default_to_action>
```

## Knob: action-mode = conservative

```markdown
<do_not_act_before_instructions>
Do not jump into implementation or change files unless clearly instructed to make changes. When the user's intent is ambiguous, default to providing information, doing research, and providing recommendations rather than taking action.
</do_not_act_before_instructions>
```

## Knob: communication = lead-with-outcome

```markdown
Lead with the outcome. Your first sentence after finishing should answer "what happened" or "what did you find" — the thing the user would ask for if they said "just give me the TLDR." Supporting detail and reasoning come after. The way to keep output short is to be selective about what you include, not to compress the writing into fragments, abbreviations, arrow chains, or jargon. When you mention files, commits, or flags, give each its own plain-language clause.
```

## Knob: communication = detailed

```markdown
After completing a task that involves tool use, provide a thorough summary of the work you've done: what changed and why, how it was verified, and what trade-offs were considered. Write complete sentences; spell out terms the user hasn't seen this session.
```

## Knob: scope = minimal

```markdown
Don't add features, refactor, or introduce abstractions beyond what the task requires. A bug fix doesn't need surrounding cleanup. Don't design for hypothetical future requirements: do the simplest thing that works well. Don't add error handling, fallbacks, or validation for scenarios that cannot happen — trust internal code and framework guarantees; only validate at system boundaries (user input, external APIs).
```

## Knob: scope = elaborate-ok

```markdown
Reasonable polish beyond the literal request is welcome — tests for adjacent edge cases, small refactors that the change obviously motivates — but name what you added beyond the ask in your summary so the user can drop it.
```

## Closing line (always included)

```markdown
<!-- ultragoal:end -->
```
