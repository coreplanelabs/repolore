# Repo Lore

Find the merge machines, delete legends, and comment magnets behind a public
GitHub repository. Paste `owner/repo` or a GitHub URL to deal six awards, then
pick your favorites to share as an image or text.

[repolore.fun](https://repolore.fun) is temporarily limited to Coreplane accounts
through Cloudflare SSO. You can run the app locally without an account.

![Example Repo Lore results from the dated Vite snapshot](docs/example.png)

## Run locally

Use Node 22 or later. Development dependencies use Bun.

```sh
bun install --frozen-lockfile
bun run build
bun run dev
```

Open http://127.0.0.1:4178. The Pytest and Vite examples are real cached snapshots
with their read dates displayed. Enter another public repo to read GitHub.
The built app needs only Node: `node scripts/serve.mjs`.
Set `REPO_ARCADE_PORT` to change the local port.

## What the awards mean

| Award | What it counts |
| --- | --- |
| Merge Machine | PR author with the most observed recent merges |
| Delete Club | Inspected PR with the most deleted lines; additions are also shown |
| Comment Magnet | Inspected PR with the most inline review comments |
| The Cast | Distinct accounts authoring observed merged PRs, including bots |
| The Long Goodbye | Oldest open PR returned by the oldest-first listing |
| Fastest Lap | Shortest observed interval between PR opening and merge |

These are a recent snapshot. They do not measure developer skill, code quality,
AI authorship, or whether a project accepts outside contributions.
Every award includes its scope and links to source PRs. [METHOD.md](METHOD.md)
defines each calculation and tie-breaker.

## Sharing

Share one award or pick any one through six. The first three are selected by
default. PNGs include the same summary shown on the page, selected award
information, coverage, and a link back to Repo Lore. Copy as text includes
source links. Shared URLs preserve the selection and perform a new read;
they are not stored snapshots. Save the PNG or JSON to preserve an exact result.
While SSO is enabled, shared site links also require Coreplane sign-in.

## GitHub limits

Reads happen in your browser, using GitHub's anonymous public API. No GitHub
token, inference service, or application backend is needed. A run reads public
metadata, up to 100 recently updated closed PRs, 30 oldest open PRs, and diff
counts for up to 10 recent merges. The merge window is 90 days; large repos
are explicitly sampled. At most 14 requests run with two diff reads at a time.

Anonymous GitHub quota is shared by source IP. If it is exhausted, the app
shows the reset time. Cached examples still work. The app never switches to
local credentials or silently retries. Successful results stay in memory for
15 minutes; reloading clears that cache. Reads stop after 24 seconds, and
responses are capped at eight million decoded characters.

## For terminal users and agents

After building:

```sh
node scripts/report.mjs owner/repo
node scripts/report.mjs owner/repo --json
node scripts/report.mjs --input saved-evidence.json
node scripts/report.mjs --input public/examples/vitejs-vite.json --json
```

JSON contains the plain-language summary, six awards, evidence links, coverage,
and normalized source facts. Show the summary and links to the reader; retain
the scope when quoting results. Saved JSON reproduces the awards offline;
replay does not verify the records against GitHub. No command changes a repo,
requests a review, or posts a comment.

## Development

```sh
bun run build
bun run typecheck
bun run test
```

Tests use injected network and time boundaries and run offline. Browser checks
are separate. [RESEARCH.md](RESEARCH.md) records the scope and prior art.

Local DM Sans and DM Mono fonts, SVG illustrations, and icons need no CDN.
Light, Dark, and System themes are available. Change `--brand-green` in
`public/styles.css` to update both the site and exported images: light
`#29E047`, dark `#3FF35D`. Confetti and hover movement respect reduced motion.

Deployment uses Cloudflare Workers static assets. [DEPLOYMENT.md](DEPLOYMENT.md)
describes the hosting and SSO requirements.

## License

Code is MIT-licensed. Fonts and icons keep their original licenses; Polylane
branding is not licensed for reuse. See [THIRD_PARTY.md](THIRD_PARTY.md).
The npm package remains `private: true`; its publish script refuses npm release.
