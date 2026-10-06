# Deploying Repo Lore

The hosted app is https://repolore.fun on Cloudflare Workers in coreplane-infra.
The saved wrangler.json pins the account and domain. The previous Polycorp
worker and its workers.dev URL were deleted on October 6, 2026.

## Build and deploy

```sh
bun install --frozen-lockfile
bun run build
bun run typecheck
bun run test
wrangler deploy --dry-run --autoconfig=false
wrangler deploy --autoconfig=false
```

Verify your Cloudflare account with wrangler whoami before deploying. If your
shell has an unrelated CLOUDFLARE_API_TOKEN, unset it for these commands to use
your Wrangler OAuth login. Never add credentials to this repo or static assets.

Only dist is deployed. .assetsignore excludes declarations and source maps.
_headers retains the browser security policy. Missing paths return 404.
workers.dev and preview URLs are disabled so they cannot bypass the domain gate.

## Temporary SSO

Cloudflare Access protects every path on repolore.fun. The app uses the existing
Cloudflare identity provider and Coreplane email-domain allow policy. Accounts
outside @coreplane.ai are denied. Access was configured before the domain was
attached. Anonymous requests to the page and its assets must redirect to the
Coreplane Cloudflare Access login; verify this after deployment. An authenticated
Coreplane session should open the app and allow its cached examples and exports.

The Access application is managed separately in the Cloudflare dashboard. Do not
remove it or enable alternate public URLs as part of a routine deployment.
Source being public on GitHub does not remove the hosted app's SSO requirement.

## Launch validation

October 6 build, typecheck, and 31 offline tests passed. Browser validation checks
cached examples, six awards, selection-aware share images, and confetti. Anonymous
GitHub quota is per source IP: live reads may display a reset time, while the
cached examples continue to work. No authenticated GitHub fallback is added.

Cloudflare docs:
https://developers.cloudflare.com/workers/static-assets/
https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/
