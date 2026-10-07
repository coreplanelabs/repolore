import { parseRepository, type Author, type Report } from "./core.js";

export const POPULAR_REPOS = ["vitejs/vite", "oven-sh/bun", "vercel/next.js", "react/react", "sveltejs/svelte", "withastro/astro", "microsoft/vscode", "rust-lang/rust"];
export const CATEGORIES: Record<string, { name: string; measure: string }> = {
  merge: { name: "Merge Machine", measure: "Most authored merges in each observed snapshot" },
  delete: { name: "Delete Club", measure: "Largest single-PR deletion among inspected merges" },
  comments: { name: "Comment Magnet", measure: "Most inline review comments on one inspected PR" },
  cast: { name: "The Cast", measure: "Most distinct authors in each observed merge snapshot" },
  oldest: { name: "The Long Goodbye", measure: "Oldest open PR by calendar age" },
  fast: { name: "Fastest Lap", measure: "Shortest observed opening-to-merge interval" }
};
export type Contributor = { author: Author; merges: number; share: number };
export function contributors(report: Report): Contributor[] {
  const groups = new Map<number, { author: Author; merges: number }>();
  const now = Date.parse(report.capturedAt);
  for (const pr of report.facts.closed) {
    if (!pr.author || pr.mergedAt === null || pr.mergedAt < now - 90 * 86_400_000 || pr.mergedAt > now) continue;
    const row = groups.get(pr.author.id) ?? { author: pr.author, merges: 0 };
    row.merges++; groups.set(pr.author.id, row);
  }
  return [...groups.values()].sort((a, b) => b.merges - a.merges || a.author.login.localeCompare(b.author.login))
    .map(row => ({ ...row, share: report.coverage.mergedObserved ? Math.round(row.merges / report.coverage.mergedObserved * 100) : 0 }));
}
export function repositoryPath(repository: string): string { return `/${parseRepository(repository).split("/").map(encodeURIComponent).join("/")}`; }
export function repositoryFromPath(path: string): string | null {
  try {
    const parts = path.split("/").slice(1);
    if (parts[0] === "leaderboards" && CATEGORIES[parts[1]]) return null;
    if (parts.length !== 2 || parts.some(part => !part || /%2f|%5c/i.test(part))) return null;
    return parseRepository(parts.map(decodeURIComponent).join("/"));
  } catch { return null; }
}
export function avatarSource(author: Author): string {
  try {
    const url = new URL(author.avatarUrl ?? "");
    if (url.origin === "https://avatars.githubusercontent.com" && (url.pathname === `/u/${author.id}` || (author.bot && /^\/in\/[1-9]\d{0,14}$/.test(url.pathname)))) return url.pathname;
  } catch { /* Old snapshots retain numeric GitHub identity. */ }
  return `/u/${author.id}`;
}
export function avatarPath(author: Author, size = 160): string { return `/_avatar${avatarSource(author)}?size=${size}`; }
export function awardPerson(report: Report, id: string): Author | null {
  if (id === "merge") return contributors(report)[0]?.author ?? null;
  const number = report.awards.find(award => award.id === id)?.evidence[0]?.number;
  return [...report.facts.details, ...report.facts.open, ...report.facts.closed].find(pr => pr.number === number)?.author ?? null;
}
export function hook(report: Report): string {
  const lead = contributors(report)[0];
  const oldest = report.awards.find(award => award.id === "oldest");
  return [lead ? `@${lead.author.login} authored ${lead.merges} of ${report.coverage.mergedObserved} observed merges.` : "Every repo has a cast. This one's next chapter is still unwritten.",
    oldest?.status === "observed" ? `${oldest.headline} is still part of the plot: ${oldest.value}.` : ""].filter(Boolean).join(" ");
}
export type LeaderboardRow = { repository: string; person: Author | null; score: number; value: string; source: string; capturedAt: string; sampled: boolean; inspected: number; repoOwner?: Author | null; stars?: number | null; language?: string | null };
export function leaderboard(reports: Report[], category: string): LeaderboardRow[] {
  if (!CATEGORIES[category]) return [];
  const rows: LeaderboardRow[] = [];
  for (const report of reports) {
    const award = report.awards.find(award => award.id === category);
    if (!award || award.status !== "observed") continue;
    const pr = [...report.facts.details, ...report.facts.open, ...report.facts.closed].find(pr => pr.number === award.evidence[0]?.number);
    const detail = report.facts.details.find(pr => pr.number === award.evidence[0]?.number);
    const score = category === "merge" ? contributors(report)[0]?.merges : category === "delete" ? detail?.deletions :
      category === "comments" ? detail?.reviewComments : category === "cast" ? contributors(report).length :
      category === "oldest" && pr ? Math.floor((Date.parse(report.capturedAt) - pr.createdAt) / 86_400_000) :
      category === "fast" && pr && pr.mergedAt !== null ? pr.mergedAt - pr.createdAt : undefined;
    if (score === undefined || !Number.isFinite(score)) continue;
    rows.push({ repository: report.repository, person: category === "cast" ? report.profile?.owner ?? null : awardPerson(report, category), score,
      value: award.value, source: award.evidence[0]?.url ?? report.url, capturedAt: report.capturedAt,
      sampled: !report.coverage.periodComplete, inspected: report.coverage.detailsRead, repoOwner: report.profile?.owner ?? null, stars: report.profile?.stars ?? null, language: report.profile?.language ?? null });
  }
  return rows.sort((a, b) => (category === "fast" ? a.score - b.score : b.score - a.score) || a.repository.localeCompare(b.repository));
}
