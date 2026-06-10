# Patterns that work

<!-- resolver: REUSABLE APPROACHES that worked here, with why they worked.
     NOT here: repo facts (facts.md), dead ends (failures.md).
     Same two layers: compiled above the ---, dated evidence below. -->

## Current understanding

- Write rubric check-phrases as literal grep strings and put that exact string in the artifact — a paraphrased heading ("setup answers" vs "knobs") makes a check unfalsifiable by grep and forces the verifier to judge substance. [VERIFIED S3, S4 · verifier flagged it twice in two goals · 2026-06-10]

- Test installs from a sandbox + the real cache path, not just --plugin-dir: the hooks.json duplicate-load failure only manifested on cached installs. Cheap: temp git repo + `cli.mjs --yes`. [VERIFIED S2 · ran it this goal · 2026-06-10]
- A fresh-context verifier pays for itself: it caught a stale "4 questions" string the worker (me) missed after three reviews of the same file. [VERIFIED S2 · verifier report · 2026-06-10]

---

## Evidence log
[2026-06-10 S2] verifier caught copy drift the worker missed; sandbox install used for scope-default proof.
[2026-06-10 S3] v0.7.0 goal: verifier PASS rubric=3669510257; flagged grep-phrase drift in rubric item 5.
[2026-06-10 S4] grep-phrase drift recurred in rubric-library goal (item 5); also: put one-off quality checks INTO the permanent test suite — the library lint caught 16 missing-check lines on its first run.
