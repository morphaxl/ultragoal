# Bug fix

Use when: fixing a reported defect — the discipline is regression-test-first, root cause over symptom.
Kind: task

## Skills to pair
Domain skills matching the buggy area, if present. Find more via `find-skills` on skills.sh.

## Rubric
- [ ] A regression test reproduces the bug: fails on pre-fix code, passes post-fix — check: `git stash -- src/ && <test cmd> (expect FAIL) && git stash pop && <test cmd> (expect PASS)`
- [ ] The diff contains a test change — check: `git diff --name-only main... | grep -E '(test|spec)'` is non-empty
- [ ] Fix is at the root cause, not a guard clause over the symptom; the why is written down — check: `git log -1 --format=%B` explains what caused the bug and why this fix addresses the cause (Google CL-description rule)
- [ ] No unrelated changes ride along — check: `git diff --stat main...` touches only the bug's module + its tests; no drive-by refactors
- [ ] Full suite still green — check: `<test cmd>` exits 0
- [ ] VERIFIER: independent sign-off recorded in the Verification log

## Stop conditions
- Budget reached, or root cause turns out to live in a dependency/another system (document the finding, pause for scope decision)

## Constraints
- Never weaken or delete an existing assertion to make the fix pass — check: diff of test files shows additions, not loosened expectations

## Sources
- https://google.github.io/eng-practices/review/developer/small-cls.html
- https://abseil.io/resources/swe-book/html/ch09.html
