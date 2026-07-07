# Research / audit / investigation

Use when: the deliverable is a document that makes claims — a research memo, a feasibility study, a codebase audit, a competitive analysis, a root-cause investigation.
Kind: task

The failure mode this template exists for: a memo's checks prove the memo *says* X, never that X is *true*. Greps confirm citations are present, not accurate; the worker's own reading is the self-report channel. Every load-bearing claim needs source-grounding an independent party can re-fetch, and the verifier must re-derive — not re-read — the conclusions.

## Skills to pair
Semantic search skills (e.g. `exa-search`) for sweeps; `find-skills` for domain-specific research tooling.

## Rubric
- [ ] Every load-bearing claim carries an inline source (URL, file:line, or command output) — check: `grep -cE '\[(source|src):' report.md` ≥ the number of claims listed in the report's own summary table
- [ ] Claims are marked by confidence — verified / read / inferred — and no inferred claim is presented as fact — check: `grep -c '\[INFERRED' report.md` prints the same count in the summary table's inferred row
- [ ] Negative claims ("X has no Y", "nobody does Z") state where they looked — check: `grep -n 'no \|not \|absent' report.md` — each hit's paragraph names the search performed (a negative claim without a search scope is unfalsifiable)
- [ ] The question the brief asked is answered in one paragraph up top, with the recommendation stated — check: `head -30 report.md` contains an explicit answer/recommendation line
- [ ] Coverage: every subtopic the brief enumerated has a section — check: `grep -c '^## ' report.md` ≥ the brief's enumerated subtopics
- [ ] VERIFIER: independent sign-off recorded in the Verification log — the verifier must RE-FETCH at least the 3 most load-bearing cited sources itself (curl/gh/WebFetch, not the worker's quotes) and confirm each supports the claim it backs; one unsupported load-bearing claim is a FAIL

## Stop conditions
- Budget reached, or a load-bearing source is unreachable/paywalled after 2 attempts (report the gap honestly instead of substituting a weaker source)

## Constraints
- No claim laundering: a secondary source citing a primary one is cited as secondary — check: spot-check 3 citations for "via" chains
- The report distinguishes what was checked this run from what memory/docs asserted — check: MANUAL — provenance tags present on reused claims

## Sources
- https://x.com/RLanceMartin/article/2064397389189071163
- https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
