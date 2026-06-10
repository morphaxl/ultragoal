# Documentation

Use when: writing or overhauling docs — READMEs, guides, reference. Structure per Diátaxis; completeness per Standard Readme.
Kind: task

## Skills to pair
Find writing/docs skills via `find-skills` on skills.sh.

## Rubric
- [ ] Zero broken links — check: `lychee --no-progress './**/*.md'` exits 0 (or `npx markdown-link-check README.md`)
- [ ] Code samples actually run — check: `pytest --doctest-modules --doctest-glob='*.md'` for Python; for shell blocks: extract and execute fenced `sh` blocks (`awk '/^```sh/,/^```$/' README.md | sh -e`)
- [ ] README structurally complete (Standard Readme: Install, Usage, License sections with code blocks) — check: `grep -E '^## (Install|Usage|License)' README.md` → 3 hits
- [ ] Each page is one Diátaxis mode — tutorial, how-to, reference, or explanation — not a blend — check: MANUAL — review against the diataxis.fr compass; docs/ structure maps to the quadrants used
- [ ] Docs match the current code: every documented command/flag exists and works — check: run each documented command, exit 0; spot-check flags against `--help`
- [ ] Install instructions verified from clean state — check: copy-paste the README install block into a fresh container/venv/temp dir and run it
- [ ] VERIFIER: independent sign-off recorded in the Verification log

## Stop conditions
- Budget reached, or documenting reveals code bugs (file them as findings; fixing is a separate goal)

## Constraints
- No documenting aspirational behavior — if the code doesn't do it yet, it doesn't go in the docs

## Sources
- https://github.com/RichardLitt/standard-readme/blob/main/spec.md
- https://diataxis.fr/
- https://github.com/lycheeverse/lychee
