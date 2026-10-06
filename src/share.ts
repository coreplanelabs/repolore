import { ArcadeError, type Award, type Report } from "./core.js";

export function shareAwards(report: Report, selection?: string | readonly string[]): Award[] {
  if (selection === undefined) return report.awards.slice(0, 3);
  const ids = typeof selection === "string" ? [selection] : [...selection];
  if (!ids.length) throw new ArcadeError("INPUT", "Pick at least one award to share.");
  if (ids.some(id => !report.awards.some(award => award.id === id))) throw new ArcadeError("INPUT", "This award is not part of the report.");
  return report.awards.filter(award => ids.includes(award.id));
}
export function shareCaption(report: Report, selection?: string | readonly string[]): string {
  const awards = shareAwards(report, selection);
  return [`Repo Lore — ${report.repository}`, report.summary, "",
    ...awards.flatMap(award => [award.name, award.headline, award.value, award.description,
      `Scope: ${award.scope}`, ...award.evidence.map(pr => `#${pr.number}: ${pr.url}`), ""]),
    `Read ${report.capturedAt}`, "Created at repolore.fun by Polylane."].filter(line => line !== undefined).join("\n");
}
