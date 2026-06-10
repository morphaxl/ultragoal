# Memory file templates

Create each file exactly in this shape. The resolver header tells every future session what belongs in the file; the `---` separates the rewritable compiled layer from the append-only evidence log.

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
