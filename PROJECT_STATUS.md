# Project closeout — October 7, 2026

Repo Lore stays as the nine-award product at https://repolore.fun. The requested
human/AI-agent pivot moved to a separate project; it does not change this app.

## Verified delivery

- UI and daily index: [PR #8](https://github.com/coreplanelabs/repolore/pull/8),
  merged as `a224d93f77cf3571adbb1a6b6451318d25f08efc`.
- Compact homepage and theme contrast: [PR #9](https://github.com/coreplanelabs/repolore/pull/9),
  merged as `bfaf2427228118dda65869ddb54ac35cb2eda447`.
- [Main deployment](https://github.com/coreplanelabs/repolore/actions/runs/37681420755):
  check and deploy passed for that exact source commit.
- [First full daily workflow](https://github.com/coreplanelabs/repolore/actions/runs/37678542910):
  passed; restored 2,982 checkpoints and published 995 readable repos from a
  1,000-repo discovery pool. This is a dated receipt, not a permanent repo count.
- The daily job runs at 10:00 UTC. Main boards show ten results; dedicated pages
  show up to 100 eligible results. Publication writes versioned records first and
  selects the catalog last. Read [METHOD.md](METHOD.md) for measurement limits.

Cloudflare Access stays enabled for @coreplane.ai. workers.dev and preview URLs
stay disabled. SSO still blocks public search and external social-preview crawlers.
No public launch or account migration was requested during closeout.
The KV publishing token expires January 5, 2027; its scope and rotation steps are
in [DEPLOYMENT.md](DEPLOYMENT.md). Values are never recorded here.

## Separate project handoff

Working name: **AI Pilled**. Local directory: `../ai-pilled`.
Child task: `01a11859-7fc3-7222-b482-c68fdd57f4dc`.
Base: Repo Lore `bfaf242`. The new repository began with no remote, a disabled
production setup, and copied public checkpoints for a labeled local preview.
Its AGENTS.md and SEED.md own the next work; the child task continues separately.

The product direction is one comparison: the share of merged PRs attributed to
verified AI-agent account IDs, with rank, agent mix, and real change over time.
Other automation and unknown authors remain separate. A GitHub User account does
not prove human-written code. Refresh registry sources during each index run and
verify new identities before counting them as AI. Do not infer AI use from names,
bios, comment volume, or GitHub Bot type alone.

The seed's 100 recent merged PRs plus 20 discussion-heavy candidates can bias AI
share. The new project must use a consistent collector before publishing its
rankings. Historical movement requires real stored readings.

Do not reuse Repo Lore hosting, KV, domain, secrets, or CI environment. Verify
DNS ownership before any new deployment and put all services for that domain on
the same Cloudflare account. Hold a Polycorp migration until the transfer is
confirmed complete; do not infer a date from an estimated transfer period.

## Retained local evidence

Normalized public capture checkpoints remain under `.data/index/reports`,
`stars`, and `history`; image receipts remain under `receipts`. Both are ignored
by Git. Disposable upload batches, local preview caches, and staging outputs can
be rebuilt and are removed at closeout. Historical PR refs preserve merged branch
heads even after branch cleanup.
