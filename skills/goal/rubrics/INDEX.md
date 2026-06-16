# Rubric library

Research-backed starting points — every threshold cited, every item carrying its check command. **Adapt, don't transplant**: replace placeholder commands with this repo's real ones, keep thresholds unless the project has better-evidenced targets, and delete items that don't apply. Before arming, pair the chosen template with [../qa-capability-map.md](../qa-capability-map.md) and run the skill-local audit (`node <goal-skill-dir>/scripts/rubric-audit.mjs <draft-goal.md>`). Templates note relevant skills to pair (install more via `npx skills add` from skills.sh; `find-skills` discovers matches).

| Template | Use when | Kind |
|---|---|---|
| [nextjs-react-feature.md](nextjs-react-feature.md) | Building/changing a feature in a Next.js or React app | task |
| [frontend-design.md](frontend-design.md) | UI must look and feel genuinely designed | task |
| [web-performance.md](web-performance.md) | Core Web Vitals or bundle size must improve | experiment |
| [accessibility.md](accessibility.md) | WCAG 2.2 AA compliance or a11y audit | task |
| [api-endpoint.md](api-endpoint.md) | Building or hardening HTTP API endpoints | task |
| [security-pass.md](security-pass.md) | Security hardening / auth audit (ASVS L2 subset) | task |
| [bug-fix.md](bug-fix.md) | Fixing a reported defect, regression-test-first | task |
| [refactor-migration.md](refactor-migration.md) | Restructuring with provable behavior preservation | task |
| [test-suite-health.md](test-suite-health.md) | Coverage, flakiness, speed, mutation score | task |
| [build-ci-speedup.md](build-ci-speedup.md) | Builds/CI must get faster | experiment |
| [dependency-upgrade.md](dependency-upgrade.md) | Package upgrades without breakage or supply-chain risk | task |
| [cli-tool.md](cli-tool.md) | Building a command-line tool (clig.dev bar) | task |
| [documentation.md](documentation.md) | Writing/overhauling docs (Diátaxis + Standard Readme) | task |
| [rn-feature.md](rn-feature.md) | React Native/Expo feature, device-check discipline | task |
| [app-store-readiness.md](app-store-readiness.md) | iOS/Android store submission prep | task |
| [realtime-stability.md](realtime-stability.md) | Websockets/live updates surviving real network life | task |

Dated thresholds (Play API levels, OWASP/WCAG versions, CWV numbers) were verified June 2026 — re-verify anything dated before relying on it in a new year.
