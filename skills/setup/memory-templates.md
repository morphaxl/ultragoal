# Memory file templates

Create each file exactly in this shape. The resolver header tells every future session what belongs in the file; the `---` separates the rewritable compiled layer from the append-only evidence log.

> **OKF alignment.** This memory bundle is in the [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf) lineage: `MEMORY.md` plays OKF's `index.md` (progressive-disclosure listing) role, and the below-the-line dated evidence log plays OKF's `log.md` (update history) role. ultragoal *extends* OKF with per-claim provenance tags and the two-layer compiled/evidence split — epistemics OKF v0.1 doesn't specify. We intentionally keep the aggregate `facts/patterns/failures` files rather than OKF's one-concept-per-file shape (a lesson store isn't an asset catalog), so these templates carry resolver headers, not YAML frontmatter — alignment by lineage, not by full conformance. See DESIGN.md §7.5.

## MEMORY.md

```markdown
# Memory index

<!-- resolver: this is the index + fixed slots. One line per entry elsewhere; no entry
     bodies here. Its head is injected into every session — keep it under 100 lines. -->

## Commands
- build: [no data yet]
- test: [no data yet]
- lint: [no data yet]
- run locally: [no data yet]

## Architecture invariants
[no data yet]

## Gotchas
[no data yet]

## Hot files
[no data yet]

## Index
<!-- - [facts.md] one-line hook · [patterns.md] ... -->
[no entries yet — first ones come from /ultragoal:remember]
```

## facts.md

```markdown
# Verified facts

<!-- resolver: things TRUE OF THIS REPO — schemas, behaviors, invariants, tool quirks.
     NOT here: reusable approaches (patterns.md), things we tried that failed (failures.md).
     Above the line: compiled truth, rewritten freely, every claim tagged
     [VERIFIED Sn · how · date] / [READ Sn · source] / [INFERRED Sn · confidence] /
     [USER-CORRECTION · date].
     Below the line: append-only dated evidence — never edit or delete. -->

## Current understanding

---

## Evidence log
```

## patterns.md

```markdown
# Patterns that work

<!-- resolver: REUSABLE APPROACHES that worked here, with why they worked.
     NOT here: repo facts (facts.md), dead ends (failures.md).
     Same two layers: compiled above the ---, dated evidence below. -->

## Current understanding

---

## Evidence log
```

## failures.md

```markdown
# Dead ends

<!-- resolver: things TRIED THAT FAILED — what was attempted, why it failed, what to do
     instead. Consult before re-attempting anything ambitious.
     NOT here: working approaches (patterns.md), repo facts (facts.md).
     Same two layers: compiled above the ---, dated evidence below. -->

## Current understanding

---

## Evidence log
```

## harness-log.md  (ONLY when the `harness-log` knob is on)

Lives at `.ultragoal/harness-log.md` (beside `config.md`/`stats.tsv`, NOT under `memory/`) — it is harness self-data about improving the *plugin*, not project knowledge, so it is never injected into sessions. Opt-in, local markdown only, never transmitted; sharing is user-initiated.

```markdown
# Harness feedback log

<!-- ultragoal's own failure observations, for improving the plugin. OPT-IN via the harness-log knob.
     Local markdown only — never transmitted; you choose whether to share it.
     Distinct from project memory: harness shortcomings go HERE; project dead ends go in
     memory/failures.md; project facts/corrections go in memory with [USER-CORRECTION].
     One entry per incident, newest at the bottom:
       ## [YYYY-MM-DD] <short title>
       - trigger: <what the user flagged / what didn't work>
       - component: rubric | gate | verifier | interview | skill-prompt | budget | memory | other
       - why: <why the harness caused or allowed it>
       - improvement: <the concrete change to ultragoal that would prevent this class>
       - provenance: [USER-FEEDBACK · date] | [INFERRED] -->
```
