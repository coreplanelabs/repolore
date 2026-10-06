import { ArcadeError, collectReport, parseRepository, replayReport, type Report } from "../src/core.js";
import { CATEGORIES, leaderboard, POPULAR_REPOS, repositoryFromPath, repositoryPath } from "../src/catalog.js";
import { pageHtml, safeJson } from "./html.js";
import { boardCard, ogSvg, reportCard, siteCard, type OgCard } from "./og.js";
export interface Store { get(key: string): Promise<string | null>; put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> }
export type ServerOptions = { assets: { fetch(request: Request): Promise<Response> }; store: Store; fetch: typeof fetch; now: () => number; png: (svg: string) => Promise<Uint8Array>; githubToken?: string; deadline?: (ms: number) => AbortSignal };
const FRESH_MS = 60 * 60_000;
export const POLICY = "default-src 'self'; connect-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";
function response(body: BodyInit | null, status = 200, type = "text/html; charset=utf-8", extra: Record<string, string> = {}): Response {
  return new Response(body, { status, headers: { "Content-Type": type, "Cache-Control": "private, max-age=0, must-revalidate", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Content-Security-Policy": POLICY, ...extra } });
}
function json(value: unknown, status = 200): Response { return response(JSON.stringify(value), status, "application/json; charset=utf-8"); }
export function createHandler(options: ServerOptions): (request: Request) => Promise<Response> {
  const deadline = options.deadline ?? ((ms: number) => AbortSignal.timeout(ms));
  const inFlight = new Map<string, Promise<Report>>();
  const rendered = new Map<string, Promise<Uint8Array>>();
  const imageCache = new Map<string, { until: number; data: string | null }>();
  async function cached(repository: string, stamp?: number): Promise<Report | null> {
    const key = stamp ? `snapshot:${repository.toLowerCase()}:${stamp}` : `repo:${repository.toLowerCase()}`;
    const raw = await options.store.get(key);
    if (!raw) return null;
    try {
      const report = replayReport(JSON.parse(raw));
      return report.repository.toLowerCase() === repository.toLowerCase() ? report : null;
    } catch { return null; }
  }
  async function getReport(repository: string, stamp?: number): Promise<Report> {
    const key = repository.toLowerCase();
    const saved = await cached(repository, stamp);
    if (saved && (stamp || options.now() - Date.parse(saved.capturedAt) < FRESH_MS)) return saved;
    if (stamp) throw new ArcadeError("NOT_FOUND", "This older preview has expired. Open the repo page for its current snapshot.");
    const previous = inFlight.get(key); if (previous) return previous;
    const pending = (async () => {
      try {
        const prefix = `/repos/${key}`;
        const adapter: typeof fetch = async (input, init) => {
          const address = new URL(String(input)), path = address.pathname.toLowerCase();
          if (address.origin !== "https://api.github.com" || !(path === prefix || path.startsWith(prefix + "/"))) throw new ArcadeError("INPUT", "Unexpected GitHub source.");
          const headers = new Headers(init?.headers); headers.set("User-Agent", "RepoLore/0.2 (+https://repolore.fun)");
          if (options.githubToken) headers.set("Authorization", `Bearer ${options.githubToken}`);
          return options.fetch(input, { ...init, headers, redirect: "error" });
        };
        const report = await collectReport(repository, { fetch: adapter, now: options.now(), signal: deadline(24_000) });
        const body = JSON.stringify(report);
        await options.store.put(`repo:${key}`, body);
        await options.store.put(`snapshot:${key}:${Date.parse(report.capturedAt)}`, body, { expirationTtl: 7 * 86_400 });
        return report;
      } catch (cause) {
        if (saved && cause instanceof ArcadeError && ["RATE_LIMIT", "NETWORK", "TIMEOUT", "GITHUB"].includes(cause.code)) return { ...saved, notes: [...saved.notes, "A fresh read was unavailable. This is the last saved public snapshot; its original read date is shown."] };
        throw cause;
      } finally { inFlight.delete(key); }
    })();
    inFlight.set(key, pending); return pending;
  }
  async function reports(): Promise<Report[]> {
    const found = await Promise.all(POPULAR_REPOS.map(repository => cached(repository)));
    return found.filter((report): report is Report => report !== null);
  }
  async function avatar(id: string, size: number): Promise<{ bytes: Uint8Array; type: string } | null> {
    const result = await options.fetch(`https://avatars.githubusercontent.com${id}?s=${size}&v=4`, { redirect: "error", signal: deadline(5000), headers: { Accept: "image/png,image/jpeg" } });
    const type = result.headers.get("Content-Type")?.split(";")[0] ?? "";
    if (!result.ok || !["image/png", "image/jpeg"].includes(type) || Number(result.headers.get("Content-Length")) > 512_000) return null;
    const bytes = new Uint8Array(await result.arrayBuffer());
    return bytes.length <= 512_000 ? { bytes, type } : null;
  }
  async function renderCardImage(card: OgCard): Promise<Uint8Array> {
    const ids = [...new Set([card.ownerId, ...card.columns.flatMap(column => [column.photoId, ...(column.photoIds ?? [])])].filter((id): id is string => Boolean(id)))];
    const images = new Map<string, string>();
    await Promise.all(ids.slice(0, 6).map(async id => {
      const key = String(id), saved = imageCache.get(key);
      if (saved && saved.until > options.now()) { if (saved.data) images.set(id, saved.data); return; }
      let data: string | null = null;
      try {
        const picture = await avatar(id, 160);
        if (picture) { let binary = ""; for (let i = 0; i < picture.bytes.length; i += 8192) binary += String.fromCharCode(...picture.bytes.subarray(i, i + 8192)); data = `data:${picture.type};base64,${btoa(binary)}`; }
      } catch { /* A missing photo cannot change the result or break the preview. */ }
      if (imageCache.size > 200) imageCache.clear();
      imageCache.set(key, { until: options.now() + FRESH_MS, data }); if (data) images.set(id, data);
    }));
    return options.png(ogSvg(card, images));
  }
  async function cardImage(card: OgCard): Promise<Uint8Array> {
    const key = JSON.stringify(card), previous = rendered.get(key);
    if (previous) return previous;
    if (rendered.size >= 24) rendered.clear();
    const image = renderCardImage(card).catch(cause => { rendered.delete(key); throw cause; });
    rendered.set(key, image); return image;
  }
  async function shell(): Promise<string> {
    const result = await options.assets.fetch(new Request("https://assets.internal/index.html"));
    if (!result.ok) throw new Error("The application shell is unavailable.");
    return result.text();
  }
  return async request => {
    if (!["GET", "HEAD"].includes(request.method)) return response("Method not allowed", 405, "text/plain", { Allow: "GET, HEAD" });
    const url = new URL(request.url), path = url.pathname;
    let result: Response;
    try {
      if (path === "/" && url.searchParams.has("repo")) {
        const repository = parseRepository(url.searchParams.get("repo") ?? "");
        return response(null, 301, "text/plain", { Location: repositoryPath(repository) });
      }
      if (path === "/robots.txt") result = response(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /_avatar/\nSitemap: ${url.origin}/sitemap.xml\n`, 200, "text/plain");
      else if (path === "/sitemap.xml") {
        const saved = await reports(), urls = saved.map(report => `<url><loc>${url.origin}${repositoryPath(report.repository)}</loc><lastmod>${report.capturedAt.slice(0, 10)}</lastmod></url>`);
        for (const id of Object.keys(CATEGORIES)) urls.push(`<url><loc>${url.origin}/leaderboards/${id}</loc></url>`);
        result = response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${url.origin}/</loc></url>${urls.join("")}</urlset>`, 200, "application/xml");
      } else if (path.startsWith("/_avatar/")) {
        const raw = path.slice(9), id = "/" + raw, size = Number(url.searchParams.get("size") ?? 160);
        if (!/^(u|in)\/[1-9]\d{0,14}$/.test(raw) || ![64, 160, 256].includes(size)) return response("Not found", 404, "text/plain");
        const image = await avatar(id, size); result = image ? response(image.bytes.slice().buffer, 200, image.type, { "Cache-Control": "private, max-age=86400" }) : response("Photo unavailable", 404, "text/plain");
      } else if (path.startsWith("/api/repos/")) {
        const repository = repositoryFromPath(path.slice(10));
        if (!repository) return json({ error: "Use owner/repo." }, 400);
        result = json(await getReport(repository));
      } else if (path === "/leaderboards") return response(null, 301, "text/plain", { Location: "/leaderboards/delete" });
      else if (path.startsWith("/leaderboards/") && CATEGORIES[path.slice(14)]) {
        const category = path.slice(14), rows = leaderboard(await reports(), category);
        result = response(pageHtml(await shell(), url.origin, undefined, { category, rows }));
      } else if (path.startsWith("/_og/") && path.endsWith(".png")) {
        let card: OgCard;
        if (path === "/_og/site.png") card = siteCard();
        else if (path.startsWith("/_og/leaderboards/") && CATEGORIES[path.slice("/_og/leaderboards/".length, -4)]) {
          const category = path.slice("/_og/leaderboards/".length, -4); card = boardCard(CATEGORIES[category].name, leaderboard(await reports(), category));
        } else {
          const repository = repositoryFromPath(path.slice(4, -4));
          if (!repository) return response("Not found", 404, "text/plain");
          const value = url.searchParams.get("v"), stamp = value && /^\d{13}$/.test(value) ? Number(value) : undefined;
          card = reportCard(await getReport(repository, stamp));
        }
        const png = await cardImage(card); result = response(png.slice().buffer, 200, "image/png", { "Cache-Control": "private, max-age=3600" });
      } else {
        const repository = repositoryFromPath(path.replace(/\/$/, ""));
        if (repository) {
          const report = await getReport(repository), canonical = repositoryPath(report.repository);
          if (path !== canonical || url.search) return response(null, 301, "text/plain", { Location: canonical });
          result = response(pageHtml(await shell(), url.origin, report));
        } else if (path === "/" || path === "/index.html") result = response(pageHtml(await shell(), url.origin));
        else result = await options.assets.fetch(request);
      }
    } catch (cause) {
      if (cause instanceof ArcadeError && cause.code === "MOVED" && cause.repository) {
        const target = repositoryPath(cause.repository);
        return response(null, 301, "text/plain", { Location: path.startsWith("/api/repos/") ? `/api/repos${target}` : target });
      }
      if (!(cause instanceof ArcadeError) && cause instanceof Error) {
        const detail = options.githubToken ? cause.message.replaceAll(options.githubToken, "[redacted]") : cause.message;
        console.warn("RepoLore request failed", { path, name: cause.name, detail });
      }
      const known = cause instanceof ArcadeError;
      const message = known ? cause.message : "This round could not be loaded. Try again later.";
      const status = known && ["NOT_FOUND", "PRIVATE"].includes(cause.code) ? 404 : known && cause.code === "INPUT" ? 400 : known && cause.code === "RATE_LIMIT" ? 429 : 503;
      if (path.startsWith("/api/")) result = json({ error: message }, status);
      else {
        const escaped = message.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
        const html = pageHtml(await shell(), url.origin).replace('id="error" class="error" role="alert" hidden', 'id="error" class="error" role="alert"')
          .replace('<p id="error-text"></p>', `<p id="error-text">${escaped}</p>`)
          .replace('<script id="repo-data" type="application/json">null</script>', `<script id="repo-data" type="application/json">${safeJson({ error: message })}</script>`);
        result = response(html, status);
      }
    }
    return request.method === "HEAD" ? new Response(null, result) : result;
  };
}
