# Self-improvement audit — does ultragoal compound and know/leverage itself? (2026-06)

Audits whether the ultragoal plugin (1) **compounds** over time via memory + research, (2) **knows its own capabilities**, and (3) **leverages them over time** — accumulated experience changing how the next goal runs. Every claim is grounded in the file that implements it. Verdict per dimension, then an honest overall. This is an audit; it changed no plugin code.

## At a glance

| Dimension | Verdict | Anchored in |
|---|---|---|
| D1 — Compounds (memory + research) | **Strong — no change** | `session-context.sh` (consult), `goal-gate.sh` (enforced distill), `memory-templates.md` (two-layer + provenance), `docs/research-foundations.md` |
| D2 — Knows its capabilities | **Adequate by design — no change** | skill descriptions (always-on commands), `goal/SKILL.md` (deep capabilities at point-of-use), `claude-md-block.md` (protocol always-on) |
| D3 — Leverages them over time | **Partial — one narrow gap** | `goal/SKILL.md` consults `archive/` ✓, but never reads `stats.tsv` at arm time; `memory-templates.md` has no usage slot |

The loop that compounds *project knowledge* is closed and enforced. The loop that would compound *how-to-use-ultragoal knowledge* is the open seam.

## D1 — Compounds over time (memory + research)

**Verdict: already does this, strongly. No change.**

- **Consult on every session.** `scripts/session-context.sh` (SessionStart hook) injects the `MEMORY.md` index head (`head -c 8192 … | head -100`) into every session, with a trust-by-provenance preamble — so each session starts from accumulated knowledge, not blank. [scripts/session-context.sh]
- **Distillation is mechanically enforced, not optional.** `scripts/goal-gate.sh`'s release step refuses to let a goal finish until lessons are distilled to `.ultragoal/memory/` (step 1 of the final-steps block) — the compounding write can't be skipped. [scripts/goal-gate.sh]
- **Two-layer memory with provenance** keeps synthesis honest: compiled truth above the `---`, append-only dated evidence below, every claim tagged `[VERIFIED]/[READ]/[INFERRED]/[USER-CORRECTION]`. [skills/setup/memory-templates.md, skills/remember/SKILL.md]
- **Maintenance compounds too.** `session-context.sh` nudges `/ultragoal:compact` every ~10 sessions and emits a **staleness warning** when repo commits outrun the newest memory entry — so memory stays sharp and self-flags when it's drifting. [scripts/session-context.sh]
- **Research compounds on a parallel track.** `docs/research/` holds dated sweep memos and `docs/research-foundations.md` maps every mechanism to its evidence; the doc states new mechanisms enter through dated memos and stale ones are removed. [docs/research-foundations.md, docs/research/]
- **A scoreboard accumulates.** `.ultragoal/stats.tsv` records one row per finished goal (turns, verifier_fails, outcome, budget). [skills/status/SKILL.md, scripts/goal-gate.sh]

This is a complete fail → investigate → verify → distill → consult loop, enforced at the gate. D1 is a strength.

## D2 — Knows its own capabilities

**Verdict: adequate, by deliberate design. No change needed (one optional note).**

- **Commands are always-on.** The skill descriptions (goal/status/verify/stop/remember/compact/setup) are the ~handful-of-skill-descriptions always-on cost; a session always knows the commands exist. [skills/*/SKILL.md frontmatter]
- **The protocol is always-on; the deep capabilities are lazy.** The `CLAUDE.md` fixed-core block injects the memory/goal *protocol* every session, but NOT a capability catalogue — it doesn't list the rubric library, panel verification, rigor tiers, experiment goals, or scouts. [skills/setup/claude-md-block.md]
- **Those deeper capabilities surface at the point of use.** When `/ultragoal:goal` runs, the goal skill itself walks the model through the rubric library (`rubrics/INDEX.md`), experiment vs task kind, rigor tiers, scout fan-out, and skill-pairing — so the system "knows" its toolkit exactly when it's arming a goal. [skills/goal/SKILL.md]
- This lazy-disclosure design is correct (a north star is near-zero always-on context); the cost is that the deeper features are only "known" if the whole goal skill is read at arm time, which it is. Optional improvement only: nothing required.

## D3 — Leverages it over time (does the loop actually close?)

**Verdict: PARTIAL — the one real, narrow gap. Experience accumulates but doesn't feed back into how the next goal is armed.**

- **What works:** the goal skill's Phase 1 consults `goals/archive/` for related past goals — *"especially their Decision journals and failure notes"* — so prior goals' *content* informs new ones. [skills/goal/SKILL.md]
- **The open seam #1 — the scoreboard is human-facing only.** `stats.tsv` is written by `goal-gate.sh` and `stop/SKILL.md` and *read* only by `status/SKILL.md` (the dashboard). The **goal skill never reads `stats.tsv` at arm time** (`grep` of `skills/goal/SKILL.md` for `stats.tsv` / trend → none). So "your recent goals here ran long / kept failing verification" is a trend the *user* sees via `/status`, not a signal the system consumes to calibrate the next goal's budget or rigor. [grep skills/goal/SKILL.md; skills/status/SKILL.md]
- **The open seam #2 — budget/rigor recommendations are reflex, not experience-driven.** The goal skill recommends a budget "sized to the rubric" from fixed tiers, with no reference to how past goals here actually consumed budget. [skills/goal/SKILL.md]
- **The open seam #3 — usage meta-knowledge has no home.** The `MEMORY.md` template ships project-shaped slots only — Commands, Architecture invariants, Gotchas, Hot files — and **no slot for ultragoal-usage lessons** ("goals in this repo need rigor=standard", "pair the frontend skill for UI work", "panel caught a class of bug worth keeping"). Such a lesson *can* land in `patterns.md`/`failures.md`, but only opportunistically; nothing prompts or slots it. [skills/setup/memory-templates.md]
- Net: ultragoal compounds knowledge *about the project* superbly, but it does not yet compound knowledge *about using ultragoal in this project* in a way that changes its own behavior next time. The dashboard shows the human the trend; the system doesn't act on it.

## Overall verdict

**ultragoal already compounds (D1 ✓) and knows its capabilities at the point of use (D2 ✓). The self-leverage loop (D3) is open at one narrow, well-defined seam: accumulated experience — the `stats.tsv` scoreboard and any usage meta-lessons — does not feed back into how the next goal is armed.** Everything needed to close it already exists (stats are recorded, memory is extensible); it just isn't wired into the arm-time decision. The fixes are small and prose-only — no engine code.

## Gaps / recommendations (require your go-ahead — not built by this goal)

Two minimal, prose-only changes would close the D3 seam; both are opt-in and cheap:

1. **Feed the scoreboard into arming.** Add ~3 lines to the goal skill's Phase 1 / dials step: at arm time, glance at the `stats.tsv` tail and let recent turns-vs-budget and verifier_fails *calibrate* the budget/rigor recommendation ("recent goals here ran past budget → size up / consider rigor=standard"). Closes seam #1 and #2 by making the existing scoreboard a consumed signal, not just a dashboard. [target: skills/goal/SKILL.md]
2. **Give usage meta-knowledge a home.** Add an "ultragoal usage (this repo)" slot to the `MEMORY.md` template (or a one-line nudge in the remember protocol) so lessons about *running goals well here* accumulate with a dedicated place, the way project facts already do. Closes seam #3. [target: skills/setup/memory-templates.md, skills/remember/SKILL.md]

### Drop-in prose for each fix (so the follow-up is one edit)

For fix 1, into the goal skill's dials/budget guidance:

> Before recommending a budget/rigor, glance at the tail of `.ultragoal/stats.tsv`. If recent goals here consistently ran past budget, size up (or suggest a higher rigor); if they finished well under, trust the lean tier. State in one line that you calibrated from history — a number grounded in this repo's actual runs beats a reflex default.

For fix 2, a new fixed slot in the `MEMORY.md` template:

> `## ultragoal usage (this repo)` — what makes goals here go well: typical budget/rigor for common goal kinds, skills worth pairing by domain, verification lenses that have caught real defects. `[no data yet]`

Both are additive prose; neither touches a script, the gate, or any test. They turn the existing scoreboard and memory from human-facing artifacts into signals the next goal consumes — which is precisely the "knows how to leverage all this" the brief asked for. Note for honesty: this closes the *mechanism* gap; whether it measurably improves outcomes is itself something the stats would later show.

Both are ~5 lines total, no scripts/engine changes, and consistent with the lean/near-zero-always-on design. If you want them, they're a small follow-up goal. If the current behavior (human reads `/status`, system runs each goal fresh) is the intended division of labor, **no change is needed** — D1/D2 are already solid and D3's gap is a refinement, not a defect.

## How this was verified

Read directly: `scripts/session-context.sh`, `scripts/goal-gate.sh`, `skills/goal/SKILL.md`, `skills/status/SKILL.md`, `skills/setup/memory-templates.md`, `skills/setup/claude-md-block.md`, `skills/remember/SKILL.md`, `docs/research-foundations.md`, `.ultragoal/stats.tsv` shape. `grep` confirmed `stats.tsv` is read only by `status`/`stop`/`gate`, never by the goal skill at arm time. No inference load-bearing; the one negative (no usage slot, no stats-at-arm) is confirmed by reading the templates and grepping the goal skill.
