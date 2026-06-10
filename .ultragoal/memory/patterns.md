# Patterns that work

<!-- resolver: REUSABLE APPROACHES that worked here, with why they worked.
     NOT here: repo facts (facts.md), dead ends (failures.md).
     Same two layers: compiled above the ---, dated evidence below. -->

## Current understanding

- Test installs from a sandbox + the real cache path, not just --plugin-dir: the hooks.json duplicate-load failure only manifested on cached installs. Cheap: temp git repo + `cli.mjs --yes`. [VERIFIED S2 · ran it this goal · 2026-06-10]
- A fresh-context verifier pays for itself: it caught a stale "4 questions" string the worker (me) missed after three reviews of the same file. [VERIFIED S2 · verifier report · 2026-06-10]

---

## Evidence log
[2026-06-10 S2] verifier caught copy drift the worker missed; sandbox install used for scope-default proof.
