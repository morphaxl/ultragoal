# CLI tool

Use when: building a command-line tool — the quality bar is clig.dev + POSIX conventions.
Kind: task

## Skills to pair
Find language/framework CLI skills via `find-skills` on skills.sh.

## Rubric
- [ ] `--help`/`-h` shows usage, all flags, and examples; exits 0 — check: `<cli> --help; echo $?` → 0 and output greps for usage + examples
- [ ] Exit codes correct: 0 success, nonzero on every failure incl. unknown flags — check: `<cli> <good>; echo $?` → 0; `<cli> <bad>; echo $?` and `<cli> --nonsense; echo $?` → nonzero
- [ ] stdout/stderr discipline: primary output pipeable on stdout, messaging on stderr (clig.dev) — check: `<cli> <ok> 2>/dev/null` shows output; `<cli> <bad> 1>/dev/null` shows the error
- [ ] Errors are actionable: say what failed and suggest the next step; no raw stack trace by default — check: `<cli> <bad> 2>&1 | head -3` reads as guidance
- [ ] NO_COLOR and non-TTY handled (no-color.org) — check: `NO_COLOR=1 <cli> <ok> | grep -P '\e\['` → no matches; same when piped
- [ ] stdin supported where input is file-like — check: `echo data | <cli> -` works
- [ ] Fresh install-and-run smoke — check: `npm pack && npm i -g ./<pkg>-*.tgz && <cli> --version` (or `pipx install . && <cli> --version`) exits 0
- [ ] VERIFIER: independent sign-off recorded in the Verification log

## Stop conditions
- Budget reached, or scope grows beyond the commands named in the objective

## Constraints
- No interactive prompts in non-TTY mode — check: `echo | <cli>` never hangs (use a timeout in the test)

## Sources
- https://clig.dev/
- https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap12.html
- https://no-color.org/
