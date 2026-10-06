# Deploying Repo Lore

Host: https://repolore.fun. Cloudflare account: coreplane-infra.
The saved `wrangler.json` pins that account and the exact custom domain.
The former Polycorp worker was deleted; the domain registration stays in its
existing account.

## Release checks

```sh
bun install --frozen-lockfile
bun run build
bun run typecheck
bun run test
wrangler deploy --dry-run --autoconfig=false
wrangler deploy --autoconfig=false --strict
```

Use `wrangler whoami` to verify the account before deployment. If the shell has
an unrelated Cloudflare API token, unset it for these commands to use the
existing Wrangler OAuth login. Never put credential values in source or logs.

## Runtime

`worker/entry.ts` serves repo pages, the report API, leaderboards, avatar proxies,
and OG PNGs. `ASSETS` contains browser modules, styles, fonts, and the shell.
`REPORTS` is the project-owned KV namespace. `.assetsignore` excludes declarations
and source maps. No database, inference service, or customer data is involved.
The existing account uses Workers Paid; CPU time is bounded at 1000 ms/request.

Capture and seed the public comparisons using the README commands. The latest
snapshot stays available if a refresh fails. Versioned OG snapshots have a
seven-day TTL. Keep read dates and incomplete coverage with displayed data.

## Optional GitHub credential

Use a credential limited to public repository reads. Store it as the Worker
secret `GITHUB_TOKEN` with `wrangler secret put GITHUB_TOKEN`; enter the value in
the terminal prompt, not in chat or a source file. The runtime attaches it only
to validated `api.github.com/repos/<owner>/<repo>` reads and rejects private
metadata before collecting records. It is never forwarded to image hosts or
serialized into a report. Local development uses `REPOLORE_GITHUB_TOKEN`.

The current comparisons were captured through the maintainer's explicit `gh`
public-read workflow. No personal CLI credential is shipped to the Worker.

## SSO and public launch

Cloudflare Access protects every path on repolore.fun, including APIs, images,
and assets. The existing Cloudflare identity provider and @coreplane.ai allow
policy apply. The application is managed separately in the Cloudflare dashboard.
Do not remove the gate during ordinary releases. workers.dev and preview URLs
remain disabled, and alternate public URLs must not bypass Access.

After deployment, verify that anonymous page, API, and image requests redirect
to Coreplane Access, then check the signed-in repo page, comparisons, photos,
and PNG. SSO prevents search indexing and external social previews. Canonical
pages and OG metadata are ready, but public launch requires a separate explicit
instruction to remove the gate.

Cloudflare docs:
https://developers.cloudflare.com/workers/static-assets/binding/
https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/
