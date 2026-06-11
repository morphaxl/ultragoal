# Verified facts

<!-- resolver: things TRUE OF THIS REPO — schemas, behaviors, invariants, tool quirks.
     NOT here: reusable approaches (patterns.md), things we tried that failed (failures.md).
     Above the line: compiled truth, rewritten freely, every claim tagged
     [VERIFIED Sn · how · date] / [READ Sn · source] / [INFERRED Sn · confidence] /
     [USER-CORRECTION · date].
     Below the line: append-only dated evidence — never edit or delete. -->

## Current understanding

- Goals are PER-SESSION, not per-repo: each lives in .ultragoal/goals/active/<slug>/goal.md with a session: field; the gate enforces only the stopping session's goal, so concurrent goals across sessions in one repo are the intended model. Owner hit the old one-goal-per-repo limit in real use (running parallel background agents). [USER-CORRECTION · 2026-06-11]

- `npx ultragoal run` defaults to FULL autonomy (--dangerously-skip-permissions); --safe is the opt-out. Owner: "by default I want it to be dangerous when you do run, that's the whole point." [USER-CORRECTION · 2026-06-10]

- During dogfooding, the LIVE gate/hooks run from the installed plugin cache (~/.claude/plugins/cache/...), not the repo working copy — repo edits to scripts take effect only after marketplace update + plugin update + restart. [VERIFIED S2 · observed: session ran 0.4.0 gate while editing 0.5.0 · 2026-06-10] Additionally, PROJECT-scoped installs pin their version per project and shadow the auto-updated user-scope install: BeyondPlay sat on 0.8.0 (no Phase-4 recap) while user scope was 0.10.4. Fix per project: `claude plugin update ultragoal@ultragoal --scope project` from that project's cwd, then restart. [VERIFIED S6 · read installed_plugins.json + ran the update · 2026-06-11]
- Defaults as of v0.5.0: install scope = project (--global opts out), scope-discipline = elaborate-ok, verification = on (off → gate releases on checked rubric + distill, no verifier). Owner chose these deliberately. [USER-CORRECTION · 2026-06-10]

- .gitignore patterns without a leading slash match at ANY depth: `research/` (meant for the top-level reference-docs dir) silently shadowed `docs/research/`, nearly losing a goal deliverable. Run `git check-ignore <path>` when creating a new docs subtree. Fixed by anchoring to `/research/`. [VERIFIED S6 · git check-ignore + fix · 2026-06-11]

- Self-referential count checks in rubrics inflate: `grep -c 'rejected:' goal.md` matches the rubric's own check text and evidence lines, not just journal entries (claimed 5, true count 4). Scope count-greps to their section with an awk range, or use a marker string that appears nowhere else. [VERIFIED S6 · verifier finding on harness-research goal · 2026-06-11]

---

## Evidence log
[2026-06-10 S2] v0.5.0 goal: installer --yes in sandbox produced project-scope enabledPlugins; 25/25 gate tests; verifier PASS rubric=280777002.
[2026-06-10 S4] owner corrected run-command default from safe to dangerous; recorded immediately per protocol.
[2026-06-11 S5] refactored single active.md → per-session active/<slug>/ dirs; gate/banner/skills/tests updated; 32 gate tests incl. concurrency cases pass.
[2026-06-11 S6] owner reported goal armed without pre-arm recap in BeyondPlay (round-5 same-session goal, conversational brief, no skill re-invocation); root causes: project-scope pin at 0.8.0 + phase-collapsing on repeat rounds. Updated pin to 0.10.4; hardened SKILL.md Phase 4 (recap+question same message, never ask before spec drafted, repeat rounds never waive) and description (re-invoke for follow-up rounds).
[2026-06-11 S6] harness-research goal: 40-source research sweep; verifier PASS rubric=1028711716; found gitignore shadowing + self-matching grep check; both fixed/recorded.
