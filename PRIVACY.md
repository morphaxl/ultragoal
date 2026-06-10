# Privacy

ultragoal collects no data. There is no telemetry, no analytics, and no server of ours.

- All state the plugin creates — goals, rubrics, memory, config, stats — is plain markdown and TSV written **locally into your repository** (`.ultragoal/`). It goes nowhere unless you commit and push it yourself.
- The hook scripts read and write local files only; they make no network requests.
- The skills and the verifier agent run entirely inside your Claude Code session, under your permission settings. Conversations are governed by [Anthropic's privacy policy](https://www.anthropic.com/legal/privacy), not by anything ultragoal adds.
- The `npx ultragoal` installer contacts only the npm registry (to fetch itself), GitHub (where Claude Code's plugin system clones this repository), and your local `claude` CLI.

Questions: open an issue at https://github.com/morphaxl/ultragoal/issues.
