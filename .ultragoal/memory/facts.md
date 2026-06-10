# Verified facts

<!-- resolver: things TRUE OF THIS REPO — schemas, behaviors, invariants, tool quirks.
     NOT here: reusable approaches (patterns.md), things we tried that failed (failures.md).
     Above the line: compiled truth, rewritten freely, every claim tagged
     [VERIFIED Sn · how · date] / [READ Sn · source] / [INFERRED Sn · confidence] /
     [USER-CORRECTION · date].
     Below the line: append-only dated evidence — never edit or delete. -->

## Current understanding

- `npx ultragoal run` defaults to FULL autonomy (--dangerously-skip-permissions); --safe is the opt-out. Owner: "by default I want it to be dangerous when you do run, that's the whole point." [USER-CORRECTION · 2026-06-10]

- During dogfooding, the LIVE gate/hooks run from the installed plugin cache (~/.claude/plugins/cache/...), not the repo working copy — repo edits to scripts take effect only after marketplace update + plugin update + restart. [VERIFIED S2 · observed: session ran 0.4.0 gate while editing 0.5.0 · 2026-06-10]
- Defaults as of v0.5.0: install scope = project (--global opts out), scope-discipline = elaborate-ok, verification = on (off → gate releases on checked rubric + distill, no verifier). Owner chose these deliberately. [USER-CORRECTION · 2026-06-10]

---

## Evidence log
[2026-06-10 S2] v0.5.0 goal: installer --yes in sandbox produced project-scope enabledPlugins; 25/25 gate tests; verifier PASS rubric=280777002.
[2026-06-10 S4] owner corrected run-command default from safe to dangerous; recorded immediately per protocol.
