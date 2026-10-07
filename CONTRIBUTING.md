# Contributing

Open a branch or fork and submit a pull request against `main`. Use Node 22+
and Bun 1.4.2. Keep tests offline, copy plain, coverage explicit, and source
links intact. Read [AGENTS.md](AGENTS.md) and [METHOD.md](METHOD.md).

Describe the idea before a large change. Keep missing-data states intact; never
turn absent records into zero counts or invented winners. Avoid quality rankings,
AI-authorship claims, or personal criticism based on comment counts.

```sh
bun install --frozen-lockfile
bun run build
bun run typecheck
bun run test
node --test test/release-guard.test.mjs test/index-publication.test.mjs
node scripts/release-guard.mjs --local
bun run wrangler versions upload --dry-run
```

Include what changed and validation results. For visual changes, include desktop
and mobile screenshots in light and dark themes.
Never commit credentials, captured private data, or generated output.
Ordinary contributions do not change hosting, Access, publication, or secrets.
The npm package stays private.

The enforced process requires the current GitHub Actions `check`, an up-to-date
branch, and resolved conversations. Admin enforcement, linear history, and
blocked force pushes/deletion remain active. Maintainers squash merge.
As verified on October 7, 2026, required approvals are set to zero under Justin's
waiver. An independent review is useful, but it is not currently an enforced gate.
Do not change branch protection without a separate user instruction.

Fork PRs run with read-only permissions and no production credentials. A
maintainer must approve runs from external contributors after inspecting the
diff, especially workflow changes. This approves running CI, not merging.
Never execute fork code through `pull_request_target`.

Successful checks on merged `main` trigger the production job. PRs never deploy.
Release credentials and recovery steps are in [DEPLOYMENT.md](DEPLOYMENT.md).
