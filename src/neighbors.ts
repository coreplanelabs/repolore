import type { Report } from "./core.js";
import { CATEGORIES, leaderboard, type LeaderboardRow } from "./catalog.js";
export type Neighbors = { rank: number; score: number; total: number; tied: boolean; ahead: LeaderboardRow | null; behind: LeaderboardRow | null };
export type CardStandings = Record<string, Neighbors | null>;
export function cardStandings(report: Report, baseline: Report[]): CardStandings {
  const reports = [...baseline.filter(row => row.repository.toLowerCase() !== report.repository.toLowerCase()), report];
  return Object.fromEntries(Object.keys(CATEGORIES).map(category => {
    const rows = leaderboard(reports, category), index = rows.findIndex(row => row.repository.toLowerCase() === report.repository.toLowerCase());
    if (index < 0) return [category, null];
    const score = rows[index].score, ahead = rows[index - 1] ?? null;
    const behind = rows[index + 1] ?? null;
    return [category, { rank: 1 + rows.filter(row => category === "fast" ? row.score < score : row.score > score).length,
      score, total: rows.length, tied: rows.some(row => row.repository.toLowerCase() !== report.repository.toLowerCase() && row.score === score), ahead, behind }];
  }));
}
