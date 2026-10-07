import { parseRepository, replayReport, type Report } from "./core.js";
import { avatarPath, repositoryFromPath, repositoryPath } from "./catalog.js";
import { cardsMarkup, standingsMarkup, castFaces, hook } from "./view.js";
import { icon, deckArtwork } from "./icons.js";
import { chartsMarkup } from "./charts.js";
import type { DailyPoint } from "./analytics.js";
import type { LeaderboardRow } from "./catalog.js";
import { resolveTheme, themePreference, type ThemePreference } from "./theme.js";

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing interface element ${id}`);
  return found as T;
}
document.querySelectorAll<HTMLElement>("[data-icon]").forEach(node => node.replaceChildren(icon(node.dataset.icon ?? "arrow")));
const form = element<HTMLFormElement>("repo-form"), input = element<HTMLInputElement>("repo-input"), submit = element<HTMLButtonElement>("submit-button");
const result = element("result"), loading = element("loading"), error = element("error");
const cache = new Map<string, Report>();
const presentationCache = new Map<string, { history: DailyPoint[]; comparison: LeaderboardRow[] }>();
let generation = 0;
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
let preference: ThemePreference = "system";
try { preference = themePreference(localStorage.getItem("repo-arcade-theme")); } catch { /* Storage is optional. */ }
function applyTheme(): void {
  document.documentElement.dataset.theme = resolveTheme(preference, systemTheme.matches);
  const green = getComputedStyle(document.documentElement).getPropertyValue("--brand-green").trim();
  document.querySelectorAll<HTMLElement>("[data-deck]").forEach(node => {
    const svg = new DOMParser().parseFromString(deckArtwork(green), "image/svg+xml").documentElement;
    svg.setAttribute("aria-hidden", "true"); node.replaceChildren(document.importNode(svg, true));
  });
  document.querySelectorAll<HTMLButtonElement>("[data-theme-choice]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.themeChoice === preference)));
}
document.querySelectorAll<HTMLButtonElement>("[data-theme-choice]").forEach(button => button.addEventListener("click", () => {
  preference = themePreference(button.dataset.themeChoice);
  try { localStorage.setItem("repo-arcade-theme", preference); } catch { /* Keep the choice for this page. */ }
  applyTheme();
}));
systemTheme.addEventListener("change", applyTheme); applyTheme();
function celebrate(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  result.querySelector(":scope > .confetti-burst")?.remove();
  const burst = document.createElement("div"); burst.className = "confetti-burst"; burst.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 28; i++) {
    const piece = document.createElement("span");
    piece.style.setProperty("--dx", `${(Math.random() - .5) * Math.min(result.clientWidth, 800)}px`);
    piece.style.setProperty("--dy", `${90 + Math.random() * 200}px`);
    piece.style.setProperty("--rotation", `${Math.random() * 360}deg`);
    piece.style.setProperty("--delay", `${Math.random() * 140}ms`); burst.append(piece);
  }
  result.append(burst); window.setTimeout(() => burst.remove(), 1700);
}
function imageFallbacks(): void {
  document.querySelectorAll<HTMLImageElement>(".portrait img, #repo-avatar").forEach(image => image.addEventListener("error", () => { image.hidden = true; }));
}
function render(report: Report, presentation?: { history: DailyPoint[]; comparison: LeaderboardRow[] }): void {
  document.documentElement.classList.add("has-report");
  input.value = report.repository;
  element("result-title").textContent = report.repository;
  element("repo-description").textContent = report.description;
  element("repo-hook").textContent = hook(report);
  element("header-cast").innerHTML = castFaces(report);
  element("insights").innerHTML = chartsMarkup(report, presentation?.history, presentation?.comparison);
  submit.textContent = "Show repo";
  element<HTMLDetailsElement>("repo-lookup").open = false;
  const owner = report.profile?.owner, avatar = element<HTMLImageElement>("repo-avatar");
  avatar.hidden = !owner;
  if (owner) { avatar.src = avatarPath(owner, 256); avatar.alt = `${report.repository.split("/")[0]} on GitHub`; }
  const metadata = [report.profile?.stars !== null && report.profile?.stars !== undefined ? `${report.profile.stars.toLocaleString("en-US")} stars` : "", report.profile?.language ?? ""].filter(Boolean);
  element("repo-meta").textContent = metadata.join(" · ");
  const c = report.coverage;
  element("scope-text").textContent = `90-DAY WINDOW · ${c.mergedObserved} OBSERVED MERGES · ${c.detailsRead} PR DIFFS INSPECTED`;
  element("read-time").textContent = `READ ${new Date(report.capturedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`;
  element("awards").innerHTML = cardsMarkup(report);
  element("standings").innerHTML = standingsMarkup(report);
  element("coverage-text").textContent = `Read ${c.closedRead} recently updated closed PRs and ${c.openRead} oldest open PRs. ${c.periodComplete ? "The listing covered the 90-day merge window." : "The closed-PR listing is a bounded sample; some merges can be missing."} Diff awards cover ${c.detailsRead} of ${c.detailsRequested} selected recent merged PRs.`;
  element("notes").replaceChildren(...report.notes.map(note => { const li = document.createElement("li"); li.textContent = note; return li; }));
  element("contribute-text").textContent = "Check the project's contribution guide before coding. The awards do not tell you whether outside PRs are welcome.";
  const link = element<HTMLAnchorElement>("contribute-link"); link.href = report.contributingUrl ?? `${report.url}#readme`;
  link.textContent = report.contributingUrl ? "Read the house rules" : "Check the project docs";
  document.title = `${report.repository} — Repo Lore`;
  const canonical = new URL(repositoryPath(report.repository), location.origin).href;
  element<HTMLLinkElement>("canonical").href = canonical;
  element<HTMLMetaElement>("og-title").content = document.title;
  element<HTMLMetaElement>("og-description").content = hook(report);
  element<HTMLMetaElement>("og-url").content = canonical;
  element<HTMLMetaElement>("og-image").content = `${location.origin}/_og${repositoryPath(report.repository)}.png?v=${Date.parse(report.capturedAt)}`;
  element<HTMLMetaElement>("twitter-image").content = element<HTMLMetaElement>("og-image").content;
  result.hidden = false; imageFallbacks(); celebrate();
}
const loadingLines = ["Shuffling the repo lore…", "Polishing the tiny trophies…", "Looking for plot twists…", "Who brought the scissors?", "Sorting out the cast…"];
async function load(raw: string, navigate = true): Promise<void> {
  const run = ++generation;
  error.hidden = true; result.hidden = true;
  let repository: string;
  try { repository = parseRepository(raw); }
  catch (cause) { element("error-text").textContent = cause instanceof Error ? cause.message : "Enter a public GitHub repository."; error.hidden = false; return; }
  input.value = repository; loading.hidden = false; submit.disabled = true; input.disabled = true;
  let line = 0; element("loading-whimsy").textContent = loadingLines[0]; element("progress-text").textContent = "Meeting the cast and reading the plot…";
  const timer = window.setInterval(() => { if (run === generation) element("loading-whimsy").textContent = loadingLines[++line % loadingLines.length]; }, 2200);
  try {
    let details: { history: DailyPoint[]; comparison: LeaderboardRow[] } | undefined;
    let expected = repository;
    let report = cache.get(repository.toLowerCase()); details = presentationCache.get(repository.toLowerCase());
    if (!report) {
      const response = await fetch(`/api/repos${repositoryPath(repository)}`, { signal: AbortSignal.timeout(30_000) });
      if (response.redirected) { expected = repositoryFromPath(new URL(response.url).pathname.slice(10)) ?? repository; }
      const body = await response.json() as { error?: string; presentation?: { history: DailyPoint[]; comparison: LeaderboardRow[] } };
      if (!response.ok) throw new Error(body.error ?? "This round could not be loaded. Try again later.");
      report = replayReport(body); details = body.presentation; if (details) presentationCache.set(report.repository.toLowerCase(), details);
    }
    if (run !== generation) return;
    if (report.repository.toLowerCase() !== expected.toLowerCase()) throw new Error("The result did not match this repository.");
    cache.set(repository.toLowerCase(), report); render(report, details);
    if (navigate) history.pushState(null, "", repositoryPath(report.repository));
    result.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  } catch (cause) {
    if (run === generation) { element("error-text").textContent = cause instanceof Error ? cause.message : "This round could not be loaded."; error.hidden = false; }
  } finally {
    window.clearInterval(timer);
    if (run === generation) { loading.hidden = true; submit.disabled = false; input.disabled = false; }
  }
}
form.addEventListener("submit", event => { event.preventDefault(); void load(input.value); });
document.querySelectorAll<HTMLButtonElement>(".repo-chip").forEach(button => button.addEventListener("click", () => { void load(button.dataset.repo ?? ""); }));
window.addEventListener("popstate", () => {
  const repo = repositoryFromPath(location.pathname);
  if (repo) void load(repo, false);
  else { ++generation; result.hidden = true; loading.hidden = true; document.documentElement.classList.remove("has-report"); (element("repo-lookup") as HTMLDetailsElement).open = true; }
});
const bootstrap = document.getElementById("repo-data")?.textContent;
if (bootstrap && bootstrap !== "null") {
  try { const data = JSON.parse(bootstrap) as { error?: string; presentation?: { history: DailyPoint[]; comparison: LeaderboardRow[] } }; if (typeof data.error === "string") { element("error-text").textContent = data.error; error.hidden = false; } else { const report = replayReport(data); if (data.presentation) presentationCache.set(report.repository.toLowerCase(), data.presentation); cache.set(report.repository.toLowerCase(), report); render(report, data.presentation); } }
  catch { element("error-text").textContent = "This snapshot could not be read. Enter the repo to try again."; error.hidden = false; }
} else {
  const initial = repositoryFromPath(location.pathname) ?? new URL(location.href).searchParams.get("repo");
  if (initial) void load(initial);
}
if (new URL(location.href).searchParams.get("preview") === "loading") {
  loading.hidden = false; element("loading-whimsy").textContent = "Shuffling the repo lore…";
  element("progress-text").textContent = "Loading animation preview — no GitHub request is running.";
}
