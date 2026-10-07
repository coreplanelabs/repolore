import type { Report } from "../src/core.js";
import { avatarPath, CATEGORIES, repositoryPath, type LeaderboardRow } from "../src/catalog.js";
import { boardMarkup, cardsMarkup, escapeHtml, hook, navigationMarkup, standingsMarkup, castFaces, glyph, helpButton } from "../src/view.js";
export function safeJson(value: unknown): string { return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029"); }
function content(html: string, id: string, value: string): string {
  const pattern = new RegExp(`(<(?:div|p|h[1-6]|section)[^>]*id="${id}"[^>]*>)([\\s\\S]*?)(<\\/(?:div|p|h[1-6]|section)>)`);
  return html.replace(pattern, (_, start: string, _old: string, end: string) => start + value + end);
}
function meta(html: string, id: string, value: string): string { return html.replace(new RegExp(`(<meta id="${id}"[^>]*content=")[^"]*(")`), (_, start: string, end: string) => start + escapeHtml(value) + end); }
import { chartsMarkup } from "../src/charts.js";
import type { CardStandings } from "../src/neighbors.js";
import type { StarHistory } from "../src/star-history.js";
import type { DailyPoint } from "../src/analytics.js";
export function pageHtml(template: string, origin: string, report?: Report, board?: { category: string; rows: LeaderboardRow[]; cohort?: string; warming?: boolean; selected?: number; provisional?: boolean }, presentation?: { history: DailyPoint[]; comparison: LeaderboardRow[]; stars?: StarHistory | null; neighbors?: CardStandings }): string {
  const title = report ? `${report.repository} — Repo Lore` : board ? `${CATEGORIES[board.category].name} — Repo Lore` : "Repo Lore — your repo has lore";
  const path = report ? repositoryPath(report.repository) : board ? `/leaderboards/${board.category}` : "/";
  const description = report ? hook(report) : board ? CATEGORIES[board.category].measure : "The people, pull requests, and plot twists behind your favorite GitHub repo.";
  const image = report ? `${origin}/_og${repositoryPath(report.repository)}.png?v=${Date.parse(report.capturedAt)}` : board ? `${origin}/_og/leaderboards/${board.category}.png?cohort=${board.cohort ?? "trending"}` : `${origin}/_og/site.png`;
  let html = template.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`).replace(/(<link id="canonical"[^>]*href=")[^"]*(")/, (_, start: string, end: string) => start + escapeHtml(origin + path) + end);
  for (const [id, value] of Object.entries({ "og-title": title, "og-description": description, "og-url": origin + path, "og-image": image, "twitter-image": image })) html = meta(html, id, value);
  html = html.replace(/(<meta name="description" content=")[^"]*(")/, (_, start: string, end: string) => start + escapeHtml(description) + end);
  if (report) {
    html = html.replace('<html lang="en-US">', '<html lang="en-US" class="has-report">').replace('id="result" class="result" aria-labelledby="result-title" hidden', 'id="result" class="result" aria-labelledby="result-title"');
    html = html.replace('id="repo-lookup" class="repo-lookup" open', 'id="repo-lookup" class="repo-lookup"');
    html = content(html, "result-title", escapeHtml(report.repository)); html = content(html, "repo-description", escapeHtml(report.description));
    html = content(html, "repo-hook", escapeHtml(description)); html = content(html, "header-cast", castFaces(report));
    html = content(html, "insights", chartsMarkup(report, presentation?.history, presentation?.comparison, presentation?.stars));
    html = content(html, "awards", cardsMarkup(report, presentation?.neighbors)); html = content(html, "standings", standingsMarkup(report));
    html = html.replace('<script id="repo-data" type="application/json">null</script>', `<script id="repo-data" type="application/json">${safeJson({ ...report, presentation })}</script>`);
    if (report.profile?.owner) html = html.replace('<img id="repo-avatar" alt="" width="96" height="96" hidden>', `<img id="repo-avatar" src="${avatarPath(report.profile.owner, 256)}" alt="${escapeHtml(report.repository.split("/")[0])}" width="96" height="96">`);
    html = content(html, "repo-meta", escapeHtml([report.profile?.stars !== null && report.profile?.stars !== undefined ? `${report.profile.stars.toLocaleString("en-US")} stars` : "", report.profile?.language ?? ""].filter(Boolean).join(" · ")));
    html = html.replace('id="repo-input" name="repo"', `id="repo-input" name="repo" value="${escapeHtml(report.repository)}"`);
    const coverage = `${report.coverage.mergedObserved} observed merges · ${report.coverage.detailsRead} PR diffs inspected · Read ${report.capturedAt.slice(0, 10)}`;
    html = html.replace('<span id="scope-text"></span>', `<span id="scope-text">${escapeHtml(coverage)}</span>`);
  }
  if (board) {
    html = html.replace('<html lang="en-US">', '<html lang="en-US" class="has-board">').replace('id="board" class="board" hidden', 'id="board" class="board"');
    html = html.replace('id="board" class="board"', `id="board" class="board" data-category="${board.category}"`);
    html = content(html, "board-emblem", glyph(board.category));
    html = content(html, "board-watermark", glyph(board.category));
    html = content(html, "board-title", escapeHtml(CATEGORIES[board.category].name)); html = content(html, "board-description", escapeHtml(description));
    html = html.replace('<nav id="board-navigation" class="board-navigation" aria-label="Award leaderboards"></nav>', `<nav id="board-navigation" class="board-navigation" aria-label="Award leaderboards">${navigationMarkup(board.category, board.cohort)}</nav>`);
    html = content(html, "board-rows", boardMarkup(board.rows));
    const cohort = board.cohort ?? "trending";
    const topTip = board.provisional ? "The current curated baseline, ordered by award results. A stars-based top-100 shortlist starts when scheduled indexing is enabled." : "Public, non-fork, non-archived repos with the most GitHub stars. The shortlist is refreshed daily.";
    const trendTip = "The 20 indexed repos with the most stars added in GitHub's daily history over the last 30 days. Award results rank that group.";
    const state = board.warming ? "\nStar history is still loading; these results use the current saved repos." : "";
    html = content(html, "cohort-controls", `<span class="cohort-label">EXPLORE</span><div class="cohort-switch"><a href="/leaderboards/${board.category}"${cohort === "trending" ? ' aria-current="page"' : ""}>${glyph("trend")}<span>Trending</span></a><a href="/leaderboards/${board.category}?cohort=top"${cohort === "top" ? ' aria-current="page"' : ""}>${glyph("star")}<span>Top stars</span></a></div>${helpButton("Trending: " + trendTip + "\n\nTop stars: " + topTip + state, "How repo pools are chosen", "Choose your league")}`);

  }
  const structured = { "@context": "https://schema.org", "@type": "WebPage", name: title, description, url: origin + path, image };
  return html.replace('</head>', `<script type="application/ld+json">${safeJson(structured)}</script></head>`);
}
