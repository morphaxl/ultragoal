# Build / CI speedup

Use when: making builds, test runs, or CI pipelines faster — a wall-clock number must drop.
Kind: experiment (measure-and-ratchet; hyperfine is the immutable measure)

## Skills to pair
Build-tool skills (turbo/nx/vite) if present. Find more via `find-skills` on skills.sh.

## Rubric
- [ ] Baseline measured statistically, not single-run — check: `hyperfine --warmup 3 --runs 10 '<build cmd>'` output (mean ± stddev) recorded as results.tsv row 1
- [ ] Cold and warm cache measured separately — check: cold via `hyperfine --prepare '<cache reset cmd>'`, warm via `--warmup 1`; both in the journal
- [ ] Claimed improvement exceeds noise: gain > 2× stddev, hyperfine outlier warning clean — check: `hyperfine --export-json` comparison of baseline vs candidate
- [ ] Cache hit rate measured where a cache exists (~70%+ local / ~90%+ remote is practitioner guidance, not an official bar) — check: `npx turbo run build --summarize` → `.turbo/runs/*.json` cache statuses (or nx equivalent)
- [ ] Real CI wall-time confirms the local result — check: `gh run list -w <workflow> --json createdAt,updatedAt | jq '.[] | ((.updatedAt|fromdate)-(.createdAt|fromdate))'` before/after (no built-in duration field — compute it)
- [ ] Build output still correct — check: full test suite exits 0 against the optimized build
- [ ] Every experiment journaled with commit hashes, including discards — check: `cat results.tsv`
- [ ] VERIFIER: independent sign-off recorded in the Verification log

## Stop conditions
- Experiment budget reached, target met, or 5 consecutive discards after a plateau-break attempt

## Constraints
- The measure command, its warmup/runs parameters, and the benchmarked target stay frozen from baseline — check: `git diff <baseline-commit>` on the bench config is empty

## Sources
- https://github.com/sharkdp/hyperfine
- https://turborepo.dev/docs/crafting-your-repository/caching
- https://cli.github.com/manual/gh_run_list
