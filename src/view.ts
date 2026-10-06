import type { Author, Report } from "./core.js";
import { avatarPath, awardPerson, CATEGORIES, contributors, hook, repositoryPath, type LeaderboardRow } from "./catalog.js";
import { awardArtwork, ICONS } from "./icons.js";

export function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!); }
export function glyph(name: string): string { const icon = ICONS[name]; return icon ? `<svg class="icon" viewBox="${icon.viewBox}" aria-hidden="true"><path fill="currentColor" d="${icon.path}"/></svg>` : ""; }
export function portrait(person: Author, className = "portrait"): string {
  return `<a class="${className}" data-initial="${escapeHtml(person.login.slice(0, 2).toUpperCase())}" href="https://github.com/${encodeURIComponent(person.login)}" target="_blank" rel="noopener noreferrer" title="@${escapeHtml(person.login)}${person.bot ? " (bot)" : ""}"><img src="${avatarPath(person)}" alt="@${escapeHtml(person.login)}" width="64" height="64" loading="lazy"></a>`;
}
export function castFaces(report: Report): string {
  const cast = contributors(report), shown = cast.slice(0, 3), rest = cast.length - shown.length;
  return `<div class="avatar-stack">${shown.map(person => portrait(person.author)).join("")}${rest ? `<span class="portrait avatar-rest" title="${rest} other authors">+${rest}</span>` : ""}</div>`;
}
export function cardsMarkup(report: Report): string {
  return report.awards.map(award => {
    const person = awardPerson(report, award.id);
    const art = award.id === "cast" ? castFaces(report) : `<span class="award-art">${awardArtwork(award.id, "var(--card-accent)")}</span>`;
    return `<article class="award ${award.status}" data-award="${award.id}" id="award-${award.id}">
      <span class="award-watermark">${glyph(award.id)}</span><div class="award-header"><div class="award-label">${art}<span>${escapeHtml(award.name.toUpperCase())}</span></div>${person && award.id !== "cast" ? portrait(person, "portrait winner-portrait") : ""}</div>
      <h3>${escapeHtml(award.headline)}</h3><p class="award-value">${escapeHtml(award.value)}</p><p class="award-description">${escapeHtml(award.description)}</p>
      <p class="award-scope">${escapeHtml(award.scope)}</p>
      ${award.evidence.length ? `<details><summary>View the PR${award.evidence.length > 1 ? "s" : ""}</summary><ul>${award.evidence.map(pr => `<li><a href="${escapeHtml(pr.url)}" target="_blank" rel="noopener noreferrer">#${pr.number} ${escapeHtml(pr.title)}</a></li>`).join("")}</ul></details>` : ""}
      <a class="compare-link" href="/leaderboards/${award.id}">See the leaderboard ${glyph("arrow")}</a>
    </article>`;
  }).join("");
}
export function standingsMarkup(report: Report): string {
  const cast = contributors(report), bots = cast.filter(row => row.author.bot).reduce((sum, row) => sum + row.merges, 0);
  return `<div class="cast-heading"><div><h3>Main characters</h3><p>Ranked by authored merges in this snapshot.</p></div><span class="bot-cameos">${bots} of ${report.coverage.mergedObserved} merges from bot accounts</span></div>
    <ol class="cast-standings">${cast.slice(0, 3).map((row, rank) => `<li><span class="cast-rank">${rank + 1}</span>${portrait(row.author)}<div><a href="https://github.com/${encodeURIComponent(row.author.login)}">@${escapeHtml(row.author.login)}</a>${row.author.bot ? `<span class="bot-label">bot</span>` : ""}<small>${row.share}% of observed merges</small></div><strong>${row.merges}<span>merged PRs</span></strong></li>`).join("")}</ol>`;
}
export function boardMarkup(rows: LeaderboardRow[]): string {
  if (!rows.length) return `<p class="board-empty">The first cast is being indexed. Come back for the opening credits.</p>`;
  return `<ol class="leaderboard-list">${rows.map((row, index) => `<li><span class="cast-rank">${index + 1}</span>${row.person ? portrait(row.person) : `<span class="portrait avatar-rest">R</span>`}<div class="board-person"><a href="${repositoryPath(row.repository)}">${escapeHtml(row.repository)}</a><small>${row.person ? `@${escapeHtml(row.person.login)}${row.person.bot ? " · bot" : ""}` : "Contributor accounts"}</small></div><div class="board-score"><strong>${escapeHtml(row.value)}</strong><small>Read ${escapeHtml(row.capturedAt.slice(0, 10))}${row.inspected ? ` · ${row.inspected} PRs inspected` : ""}</small></div><a class="board-source" href="${escapeHtml(row.source)}" target="_blank" rel="noopener noreferrer">PR ${glyph("arrow")}</a></li>`).join("")}</ol>`;
}
export function navigationMarkup(active?: string): string { return Object.entries(CATEGORIES).map(([id, category]) => `<a href="/leaderboards/${id}"${active === id ? ' aria-current="page"' : ""}>${escapeHtml(category.name)}</a>`).join(""); }
export { hook };
