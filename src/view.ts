import type { CardStandings, Neighbors } from "./neighbors.js";
import type { Author, Award, Report } from "./core.js";
import { avatarPath, awardPerson, CATEGORIES, contributors, hook, repositoryPath, type LeaderboardRow } from "./catalog.js";
import { awardArtwork, ICONS } from "./icons.js";

export function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!); }
export function glyph(name: string): string { const icon = ICONS[name]; return icon ? `<svg class="icon" viewBox="${icon.viewBox}" aria-hidden="true"><path fill="currentColor" d="${icon.path}"/></svg>` : ""; }
export function portrait(person: Author, className = "portrait"): string {
  return `<a class="${className}" data-initial="${escapeHtml(person.login.slice(0, 2).toUpperCase())}" href="https://github.com/${encodeURIComponent(person.login)}" target="_blank" rel="noopener noreferrer" title="@${escapeHtml(person.login)}${person.bot ? " (bot)" : ""}"><img src="${avatarPath(person)}" alt="@${escapeHtml(person.login)}" width="64" height="64" loading="lazy"></a>`;
}
export function castFaces(report: Report, botsOnly = false): string {
  const cast = contributors(report).filter(row => !botsOnly || row.author.bot), shown = cast.slice(0, 3), rest = cast.length - shown.length;
  return `<div class="avatar-stack">${shown.map(person => portrait(person.author)).join("")}${rest ? `<span class="portrait avatar-rest" title="${rest} other authors">+${rest}</span>` : ""}</div>`;
}
function cardDescription(report: Report, award: Award): string {
  if (award.status !== "observed" || (award.id === "bots" && !award.evidence.length)) return award.description;
  if (award.id === "delete") {
    const detail = report.facts.details.find(pr => pr.number === award.evidence[0]?.number);
    return `A big day for backspace.${detail ? ` Also added ${detail.additions.toLocaleString("en-US")} lines.` : ""}`;
  }
  return ({ merge: "Keeping the merge button warm.", comments: "This PR brought the conversation.", cast: "Roll credits. Meet the people behind the PRs.", oldest: "Still part of the plot.", fast: "Blink and it merged.", bots: "The automation crew put in a shift." } as Record<string, string>)[award.id] ?? award.description;
}
function cardFooter(report: Report, award: Award): string {
  const coverage = ["delete", "comments"].includes(award.id) ? `${report.coverage.detailsRead} PRs inspected` : award.id === "oldest" ? `${report.coverage.openRead} open PRs read` : `90 days · ${report.coverage.mergedObserved} observed merges`;
  const evidence = award.evidence.length ? `<details class="card-evidence"><summary>${glyph("github")}<span>View the PR${award.evidence.length > 1 ? "s" : ""}</span>${glyph("chevron")}</summary><ul>${award.evidence.map(pr => `<li><a href="${escapeHtml(pr.url)}" target="_blank" rel="noopener noreferrer">${glyph("github")} #${pr.number} ${escapeHtml(pr.title)}</a></li>`).join("")}</ul></details>` : "";
  return `<footer class="award-footer"><div class="card-coverage"><span>${coverage}</span>${helpButton(award.scope + "\n" + award.description, "What this award counts", "About this award")}</div><div class="award-actions">${evidence}<a class="compare-link" href="/leaderboards/${award.id}">Leaderboard ${glyph("arrow")}</a></div></footer>`;
}
export function cardsMarkup(report: Report, standings?: CardStandings): string {
  return report.awards.map(award => {
    const person = awardPerson(report, award.id);
    const art = award.id === "cast" ? castFaces(report) : `<span class="award-art">${awardArtwork(award.id, "var(--card-accent)")}</span>`;
    return `<article class="award ${award.status}" data-award="${award.id}" id="award-${award.id}">
      <span class="award-watermark">${glyph(award.id)}</span><div class="award-header"><div class="award-label">${art}<span>${escapeHtml(award.name.toUpperCase())}</span>${award.id === "bots" ? `<div class="bot-crew">${castFaces(report, true)}</div>` : ""}</div>${person && !["cast", "bots"].includes(award.id) ? portrait(person, "portrait winner-portrait") : ""}</div>
      <h3>${escapeHtml(award.headline)}</h3><p class="award-value">${escapeHtml(award.value)}</p><p class="award-description">${escapeHtml(cardDescription(report, award))}</p>
      ${nearbyMarkup(award.id, standings?.[award.id])}
      ${cardFooter(report, award)}
    </article>`;
  }).join("");
}
function nearbyMarkup(category: string, neighbors?: Neighbors | null): string {
  if (!neighbors) return "";
  const peer = (row: LeaderboardRow | null, position: "above" | "below") => {
    if (!row) return "";
    const equal = row.score === neighbors.score, direction = equal ? "Level with" : position === "above" ? "Just ahead" : "Just behind", person = row.person ?? row.repoOwner;
    return `<a class="rival-peek ${position}" href="${repositoryPath(row.repository)}#award-${category}" aria-label="${direction}: ${row.person ? "@" + escapeHtml(row.person.login) + " in " : ""}${escapeHtml(row.repository)}, ${escapeHtml(row.value)}"><span class="peer-direction" aria-hidden="true">${glyph(equal ? "rankEqual" : position === "above" ? "rankUp" : "rankDown")}</span>${person ? `<img src="${avatarPath(person, 64)}" width="20" height="20" alt="" loading="lazy">` : ""}<span class="peer-repo">${escapeHtml(row.repository)}</span><span class="peer-value">${escapeHtml(row.value)}</span></a>`;
  };
  const name = `${neighbors.tied ? "Tied " : ""}#${neighbors.rank} of ${neighbors.total}`;
  return `<aside class="card-rivals" aria-label="Nearby repos in ${escapeHtml(CATEGORIES[category].name)}">${peer(neighbors.ahead, "above")}<div class="rank-current"><a class="rank-focus" href="/leaderboards/${category}" aria-label="${name}"><span class="rank-label">REPO RANK</span><strong class="rank-number">#${neighbors.rank}</strong><span class="rank-context">of ${neighbors.total}${neighbors.tied ? '<span class="rank-tie">Tied</span>' : ""}</span></a>${helpButton("Ranks: Saved repo snapshots\nTies: Same score, same rank\nCoverage: Each repo's sample applies", "About this comparison", "Around your repo")}</div>${peer(neighbors.behind, "below")}</aside>`;
}
export function standingsMarkup(report: Report): string {
  const cast = contributors(report), bots = cast.filter(row => row.author.bot).reduce((sum, row) => sum + row.merges, 0);
  return `<div class="cast-heading"><div><h3>Main characters</h3><p>Ranked by authored merges in this snapshot.</p></div><span class="bot-cameos">${bots} of ${report.coverage.mergedObserved} merges from bot accounts</span></div>
    <ol class="cast-standings">${cast.slice(0, 3).map((row, rank) => `<li><span class="cast-rank">${rank + 1}</span>${portrait(row.author)}<div><a href="https://github.com/${encodeURIComponent(row.author.login)}">@${escapeHtml(row.author.login)}</a>${row.author.bot ? `<span class="bot-label">bot</span>` : ""}<small>${row.share}% of observed merges</small><svg class="contributor-bar" viewBox="0 0 100 5" preserveAspectRatio="none" aria-hidden="true"><rect width="${row.share}" height="5" rx="2" fill="var(--brand-green)"/></svg></div><strong>${row.merges}<span>merged PRs</span></strong></li>`).join("")}</ol>`;
}
export function helpButton(text: string, label: string, title = "Behind the number"): string {
  return `<button type="button" class="help-trigger" aria-label="${escapeHtml(label)}" data-help-title="${escapeHtml(title)}" data-help="${escapeHtml(text)}">${glyph("info")}</button>`;
}
export function boardMarkup(rows: LeaderboardRow[]): string {
  if (!rows.length) return `<p class="board-empty">The first cast is being indexed. Come back for the opening credits.</p>`;
  return `<ol class="leaderboard-list">${rows.map((row, index) => {
    const team = Boolean(row.cast), scope = `Read: ${row.capturedAt.slice(0, 10)}\nPRs inspected: ${row.inspected}\nCoverage: ${row.sampled ? "Sampled merges" : "Full merge window"}`;
    const repoIcon = row.repoOwner ? `<img class="repo-mini" src="${avatarPath(row.repoOwner, 64)}" alt="" width="18" height="18" loading="lazy">` : glyph("github");
    const growth = row.starAdded !== undefined ? `${glyph("trend")} +${row.starAdded.toLocaleString("en-US")} / ${row.starDays}d` : "";
    const metadata = [row.stars !== null && row.stars !== undefined ? `${glyph("star")} ${row.stars.toLocaleString("en-US")}` : "", growth, row.language ? escapeHtml(row.language) : ""].filter(Boolean).map(stat => `<span class="repo-stat">${stat}</span>`).join('');
    const faces = team ? `<div class="board-facepile avatar-stack">${row.cast!.length ? row.cast!.map(person => portrait(person)).join("") : `<span class="board-crew-empty">${glyph("bots")}</span>`}${(row.castCount ?? 0) > 3 ? `<span class="portrait avatar-rest">+${row.castCount! - 3}</span>` : ""}</div>` : row.person ? portrait(row.person) : `<span class="portrait avatar-rest">R</span>`;
    const scoreParts = row.value.split(" "), number = scoreParts.shift() ?? "", unit = scoreParts.join(" ");
    const compactUnit = ({ "review comments": "comments", "contributor accounts": "authors", "bot-authored merges": "bot PRs", "bot-authored merge": "bot PR", "lines deleted": "lines", "merged PRs": "PRs", "merged PR": "PR" } as Record<string, string>)[unit] ?? unit;
    const name = team ? `<a class="team-name" href="${repositoryPath(row.repository)}">${escapeHtml(row.repository)}</a>` : `<strong>${row.person ? `@${escapeHtml(row.person.login)}` : escapeHtml(row.repository)}${row.person?.bot ? `<span class="bot-label">bot</span>` : ""}</strong>`;
    const source = `<a class="board-source" href="${escapeHtml(row.source)}" target="_blank" rel="noopener noreferrer" aria-label="${team ? "Open repository evidence" : "Open the source PR"}">${glyph("github")}</a>`;
    const explanation = helpButton(scope + (row.starAdded !== undefined ? `\nStars added: +${row.starAdded.toLocaleString("en-US")} / ${row.starDays}d\nUnstars not subtracted.` : "\nStars added: Not available"), "Explain this result");
    return `<li class="${team ? "team-row" : "person-row"}"><span class="cast-rank">${index + 1}</span>${faces}<div class="board-person">${name}${team ? `<span class="team-caption">${repoIcon} ${escapeHtml(row.crewLabel ?? "Contributors")}</span>` : `<a class="board-repo" href="${repositoryPath(row.repository)}">${repoIcon}${escapeHtml(row.repository)}</a>`}</div><small class="repo-facts board-facts">${metadata}</small><div class="board-result"><div class="board-score"><strong>${escapeHtml(number)}</strong><span class="metric-long">${escapeHtml(unit)}</span><span class="metric-short">${escapeHtml(compactUnit)}</span></div><div class="board-actions">${explanation}${source}</div></div></li>`;

  }).join("")}</ol>`;
}
export function suggestionsMarkup(rows: LeaderboardRow[]): string {
  if (!rows.length) return "";
  return `<span>TRY A REPO</span>${rows.slice(0, 3).map(row => `<button class="repo-chip" data-repo="${escapeHtml(row.repository)}" aria-label="Look up ${escapeHtml(row.repository)}">${row.repoOwner ? `<img src="${avatarPath(row.repoOwner, 64)}" width="18" height="18" alt="">` : glyph("github")}${escapeHtml(row.repository.split("/")[1])}</button>`).join("")}`;
}
export function cohortMarkup(board: { category: string; cohort?: string; provisional?: boolean; selected?: number; warming?: boolean }): string {
  const cohort = board.cohort ?? "trending";
  const help = `Trending: Up to 20 repos with the most new stars in 30 days.\n\nTop stars: ${board.provisional ? `${board.selected ?? 8} saved repos for now. Top-100 star index comes next.` : "The 100 most-starred public repos."}\n\nRanks follow the selected award.${board.warming ? "\nStar history pending; showing saved repos." : ""}`;
  return `<span class="cohort-label">EXPLORE</span><div class="cohort-switch"><a href="/leaderboards/${board.category}"${cohort === "trending" ? ' aria-current="page"' : ""}>${glyph("trend")}<span>Trending</span></a><a href="/leaderboards/${board.category}?cohort=top"${cohort === "top" ? ' aria-current="page"' : ""}>${glyph("star")}<span>Top stars</span></a></div>${helpButton(help, "How repo pools are chosen", "Choose your league")}`;
}
export function navigationMarkup(active?: string, cohort = "trending"): string { return Object.entries(CATEGORIES).map(([id, category]) => `<a href="/leaderboards/${id}${cohort === "top" ? "?cohort=top" : ""}" data-category="${id}"${active === id ? ' aria-current="page"' : ""}>${glyph(id)}<span>${escapeHtml(category.name)}</span></a>`).join(""); }
export { hook };
