# Privacy

ultragoal collects no data. There is no telemetry, no analytics, and no server of ours.

- All state the plugin creates — goals, rubrics, memory, config, stats — is plain markdown and TSV written **locally into your repository** (`.ultragoal/`). It goes nowhere unless you commit and push it yourself.
- The optional **harness-feedback log** (`harness-log` knob, off by default) is no exception: when you turn it on, ultragoal records its own failure observations to a local `.ultragoal/harness-log.md` and nothing more. There is no upload, no aggregation, no "phone home" — if you ever want to share it (e.g. to help improve the harness), that is a file you choose to hand over by hand. Others' logs are never sent to anyone without their own deliberate action.
- The hook scripts read and write local files only; they make no network requests.
- The skills and the verifier agent run entirely inside your Claude Code session, under your permission settings. Conversations are governed by [Anthropic's privacy policy](https://www.anthropic.com/legal/privacy), not by anything ultragoal adds.
- The `npx ultragoal` installer contacts only the npm registry (to fetch itself), GitHub (where Claude Code's plugin system clones this repository), and your local `claude` CLI.

Questions: open an issue at https://github.com/shamilkayal/ultragoal/issues.
