# ultragoal

Maintainer guide — repo layout, dev/test commands, and the release/publish process — is in @AGENTS.md. Read it before shipping changes; in particular, releases publish to npm automatically, so never run `npm publish` by hand.

<!-- ultragoal:start — managed block; edit knobs via /ultragoal:setup or by hand -->
## Memory & goals (ultragoal)

- Before substantial work, consult `.ultragoal/memory/MEMORY.md` and the relevant topic files. Trust `[VERIFIED]` claims; treat `[READ]` as only as good as its source and `[INFERRED]` as hypotheses to re-check before relying on them.
- When you learn something durable — a confirmed approach, a dead end, an expensive derivation you'd hate to redo — record it per the memory protocol (the `ultragoal:remember` skill). Don't save what the repo or git history already records; update entries rather than duplicating.
- When the user corrects you, write it to memory immediately (`[USER-CORRECTION]`) — it's the highest-confidence signal there is, and it dies with the session if deferred.
- Memory files are two layers: compiled truth above the `---` (rewrite freely), dated evidence log below it (append-only — never edit or delete evidence lines).
- Active goals live in `.ultragoal/goals/active/<slug>/goal.md` (one per session). Never check a rubric box without evidence from a command run this session, and never self-certify the VERIFIER item.
- Before reporting progress, audit each claim against a tool result from this session. If tests fail, say so with the output; if a step was skipped, say that.

<default_to_action>
By default, implement changes rather than only suggesting them. If the user's intent is unclear, infer the most useful likely action and proceed, using tools to discover any missing details instead of guessing.
</default_to_action>

Lead with the outcome. Your first sentence after finishing should answer "what happened" or "what did you find" — the thing the user would ask for if they said "just give me the TLDR." Supporting detail and reasoning come after. Keep output short by being selective about what you include, not by compressing the writing into fragments or jargon.

Reasonable polish beyond the literal request is welcome — tests for adjacent edge cases, small refactors the change obviously motivates — but name what you added beyond the ask in your summary so the user can drop it.

## Harness feedback log (ultragoal)

When the user signals the harness itself misbehaved — a wrong default, a misleading interview question, a missing or weak rubric check, ceremony on a task that didn't need a goal, a gate that fired wrongly, an undersized budget — append a self-observation to `.ultragoal/harness-log.md` (create it if missing). Reason about ultragoal, not the project: which harness component was at fault (rubric / gate / verifier / interview / skill-prompt / budget / memory), why it let the mistake through, and the concrete change to ultragoal that would prevent that class. One entry per incident: `## [date] <title>` then `- trigger:` / `- component:` / `- why:` / `- improvement:` / `- provenance: [USER-FEEDBACK · date]`. Keep it distinct from project memory — a harness shortcoming goes here; a project dead end goes in `failures.md`; a project fact/correction goes in memory with `[USER-CORRECTION]`. It is local markdown only — never transmitted; sharing is yours to initiate.

<!-- ultragoal:end -->
