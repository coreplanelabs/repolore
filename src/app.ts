import { collectReport, parseRepository, plainReport, replayReport, type Award, type Report } from "./core.js";
import { shareAwards, shareCaption } from "./share.js";
import { ICONS, icon, deckArtwork, awardArt, awardArtwork } from "./icons.js";
import { resolveTheme, themePreference, type ThemePreference } from "./theme.js";

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing interface element ${id}`);
  return found as T;
}
document.querySelectorAll<HTMLElement>("[data-icon]").forEach(node => node.replaceChildren(icon(node.dataset.icon ?? "share")));
function buttonIcon(button: HTMLElement, label: string, name: string): void { button.replaceChildren(document.createTextNode(label), icon(name)); }
const form = element<HTMLFormElement>("repo-form");
const input = element<HTMLInputElement>("repo-input");
const submit = element<HTMLButtonElement>("submit-button");
const result = element("result");
const loading = element("loading");
const error = element("error");
const messages = element("action-message");
const cache = new Map<string, Report>();
let current: Report | null = null;
let generation = 0;
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
let preference: ThemePreference = "system";
try { preference = themePreference(localStorage.getItem("repo-arcade-theme")); } catch { /* Storage is optional. */ }
function applyTheme(): void {
  document.documentElement.dataset.theme = resolveTheme(preference, systemTheme.matches);
  document.documentElement.dataset.themePreference = preference;
  const green = getComputedStyle(document.documentElement).getPropertyValue("--brand-green").trim();
  document.querySelectorAll<HTMLElement>("[data-deck]").forEach(node => {
    const svg = new DOMParser().parseFromString(deckArtwork(green), "image/svg+xml").documentElement;
    svg.setAttribute("aria-hidden", "true"); node.replaceChildren(document.importNode(svg, true));
  });
  document.querySelectorAll<HTMLButtonElement>("[data-theme-choice]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.themeChoice === preference));
  });
}
document.querySelectorAll<HTMLButtonElement>("[data-theme-choice]").forEach(button => button.addEventListener("click", () => {
  preference = themePreference(button.dataset.themeChoice);
  try { localStorage.setItem("repo-arcade-theme", preference); } catch { /* Keep the choice for this page. */ }
  applyTheme();
}));
systemTheme.addEventListener("change", applyTheme);
applyTheme();

function paragraph(className: string, value: string): HTMLParagraphElement {
  const el = document.createElement("p"); el.className = className; el.textContent = value; return el;
}
function celebrate(target: HTMLElement): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  target.querySelector(":scope > .confetti-burst")?.remove();
  const burst = document.createElement("div"); burst.className = "confetti-burst"; burst.setAttribute("aria-hidden", "true");
  const spread = Math.min(target.clientWidth * .6, 400);
  for (let i = 0; i < 28; i++) {
    const piece = document.createElement("span");
    piece.style.setProperty("--dx", `${(Math.random() - .5) * spread * 2}px`);
    piece.style.setProperty("--dy", `${90 + Math.random() * 200}px`);
    piece.style.setProperty("--rotation", `${Math.random() * 360}deg`);
    piece.style.setProperty("--delay", `${Math.random() * 140}ms`);
    burst.append(piece);
  }
  target.append(burst);
  window.setTimeout(() => burst.remove(), 1700);
}
function renderAward(award: Award, report: Report): HTMLElement {
  const card = document.createElement("article"); card.className = `award ${award.status}`;
  card.id = `award-${award.id}`; card.dataset.award = award.id;
  const label = document.createElement("div"); label.className = "award-label";
  const glyph = document.createElement("span"); glyph.className = "award-art"; glyph.append(awardArt(award.id));
  label.append(glyph, document.createTextNode(award.name.toUpperCase()));
  const header = document.createElement("div"); header.className = "award-header";
  const share = document.createElement("button"); share.className = "award-share"; share.type = "button";
  buttonIcon(share, "Share", "share"); share.setAttribute("aria-label", `Share ${award.name}`);
  share.addEventListener("click", () => { void showShareCard(report, award.id); });
  header.append(label, share);
  const title = document.createElement("h3"); title.textContent = award.headline;
  const watermark = icon(award.id); watermark.classList.add("award-watermark");
  card.append(watermark, header, title, paragraph("award-value", award.value), paragraph("award-description", award.description), paragraph("award-scope", award.scope));
  if (award.evidence.length) {
    const receipts = document.createElement("details");
    const summary = document.createElement("summary"); summary.textContent = `View ${award.evidence.length === 1 ? "the PR" : "the PRs"}`;
    const list = document.createElement("ul");
    for (const pr of award.evidence) {
      const item = document.createElement("li"); const link = document.createElement("a");
      link.href = pr.url; link.target = "_blank"; link.rel = "noopener noreferrer";
      link.textContent = `#${pr.number} ${pr.title}`; item.append(link); list.append(item);
    }
    receipts.append(summary, list); card.append(receipts);
  }
  return card;
}
function render(report: Report): void {
  current = report;
  element("result-title").textContent = report.repository;
  element("repo-description").textContent = report.description;
  element("summary").textContent = report.summary;
  const c = report.coverage;
  element("scope-text").textContent = `90-DAY WINDOW · ${c.mergedObserved} OBSERVED MERGES · ${c.detailsRead} PR DIFFS INSPECTED`;
  element("read-time").textContent = `READ ${new Date(report.capturedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`;
  element("awards").replaceChildren(...report.awards.map(award => renderAward(award, report)));
  element("coverage-text").textContent = `I read ${c.closedRead} recently updated closed PRs and ${c.openRead} oldest open PRs, using ${c.requests} public GitHub requests. ${c.periodComplete ? "The closed-PR listing covered the 90-day merge window." : "The closed-PR listing is a bounded sample; merges outside that sample can be missing."} Diff awards cover ${c.detailsRead} of ${c.detailsRequested} selected recent merged PRs.`;
  element("notes").replaceChildren(...report.notes.map(note => { const li = document.createElement("li"); li.textContent = note; return li; }));
  element("contribute-text").textContent = "Check the project's contribution guide before coding. These awards do not establish whether it accepts external PRs.";
  const link = element<HTMLAnchorElement>("contribute-link");
  link.href = report.contributingUrl ?? `${report.url}#readme`;
  link.textContent = report.contributingUrl ? "Read the house rules" : "Check the project docs";
  result.hidden = false;
  celebrate(result);
  document.title = `${report.repository} — Repo Lore`;
}
const loadingLines = ["Shuffling the repo lore…", "Polishing the tiny trophies…", "Looking for plot twists…", "Who brought the scissors?", "Sorting out the trophies…"];
async function load(raw: string, example = false, focusCard?: string, sharedIds?: string): Promise<void> {
  const run = ++generation;
  error.hidden = true; result.hidden = true; messages.textContent = ""; current = null;
  let repository: string;
  try { repository = parseRepository(raw); }
  catch (cause) { element("error-text").textContent = cause instanceof Error ? cause.message : "Enter a public GitHub repository."; error.hidden = false; return; }
  input.value = repository;
  loading.hidden = false; submit.disabled = true; input.disabled = true;
  let loadingLine = 0;
  element("loading-whimsy").textContent = loadingLines[0];
  element("progress-text").textContent = "Finding your public repository…";
  const loadingTimer = window.setInterval(() => {
    if (run === generation) element("loading-whimsy").textContent = loadingLines[++loadingLine % loadingLines.length];
  }, 2200);
  document.querySelectorAll<HTMLButtonElement>(".repo-chip").forEach(button => button.disabled = true);
  try {
    const started = performance.now();
    const cached = cache.get(repository.toLowerCase());
    let report: Report;
    if (example && ["pytest-dev/pytest", "vitejs/vite"].includes(repository)) {
      element("progress-text").textContent = "Opening a real, dated example…";
      let response: Response;
      try { response = await window.fetch(`./examples/${repository.replace("/", "-")}.json`, { signal: AbortSignal.timeout(5000) }); }
      catch { throw new Error("This cached example could not be loaded. Enter a repository to read GitHub instead."); }
      if (!response.ok) throw new Error("This example is not available. Enter a repository to read GitHub instead.");
      report = replayReport(await response.json());
      if (report.repository !== repository) throw new Error("The example does not match this repository.");
    } else if (cached && Date.now() - Date.parse(cached.capturedAt) < 15 * 60_000) report = cached;
    else report = await collectReport(repository, {
        fetch: window.fetch.bind(window), now: Date.now(), signal: AbortSignal.timeout(24_000),
        onProgress: value => { if (run === generation) element("progress-text").textContent = value; }
      });
    if (run !== generation) return;
    cache.set(repository.toLowerCase(), report); render(report);
    const shared = sharedIds;
    result.dataset.elapsedMs = String(Math.round(performance.now() - started));
    result.dataset.cached = String(Boolean(cached && report === cached));
    if (example) element("read-time").textContent = `REAL CACHED EXAMPLE · READ ${new Date(report.capturedAt).toLocaleDateString("en-US")}`;
    const url = new URL(window.location.pathname, window.location.origin); url.searchParams.set("repo", report.repository);
    if (example) url.searchParams.set("example", "1"); url.hash = "";
    const target = focusCard && report.awards.some(award => award.id === focusCard) ? element(`award-${focusCard}`) : result;
    if (target !== result && focusCard) url.searchParams.set("card", focusCard);
    if (shared) url.searchParams.set("awards", shared);
    history.replaceState(null, "", url);
    if (target !== result) target.classList.add("shared-award");
    if (shared) {
      try { await showShareCard(report, shared.split(",")); }
      catch { messages.textContent = "That award selection is unavailable. Pick your awards with Share results."; }
    }
    target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  } catch (cause) {
    if (run !== generation) return;
    element("error-text").textContent = cause instanceof Error ? cause.message : "This round could not be loaded. Please try again later.";
    error.hidden = false;
  } finally {
    window.clearInterval(loadingTimer);
    if (run === generation) {
      loading.hidden = true; submit.disabled = false; input.disabled = false;
      document.querySelectorAll<HTMLButtonElement>(".repo-chip").forEach(button => button.disabled = false);
    }
  }
}
form.addEventListener("submit", event => { event.preventDefault(); void load(input.value); });
document.querySelectorAll<HTMLButtonElement>(".repo-chip").forEach(button => button.addEventListener("click", () => { void load(button.dataset.repo ?? "", button.dataset.example === "true"); }));
async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); return true; }
  } catch { /* Some embedded browsers lack clipboard permissions. */ }
  const field = document.createElement("textarea"); field.className = "sr-only"; field.value = value;
  document.body.append(field); field.focus({ preventScroll: true }); field.select();
  try { return document.execCommand("copy"); } catch { return false; } finally { field.remove(); }
}
element("copy-button").addEventListener("click", async () => {
  if (!current) return;
  const content = `${plainReport(current)}\n\nRun this repo: ${window.location.href}`;
  if (await copyText(content)) messages.textContent = "Results copied. Go tell the group chat.";
  else messages.textContent = "The browser could not copy the report. You can still save the evidence or share the page URL.";
});
const exportDialog = element<HTMLDialogElement>("export-dialog");
let exportUrl: string | null = null;
let exportedCaption = "";
let exportedLink = "";
let shareReport: Report | null = null;
let selectedIds: string[] = [];
let shareGeneration = 0;
function previewExport(blob: Blob, filename: string, json: string | null = null, sharing?: { caption: string; link: string }): void {
  if (exportUrl) URL.revokeObjectURL(exportUrl);
  exportUrl = URL.createObjectURL(blob);
  const image = element<HTMLImageElement>("export-image");
  const data = element<HTMLTextAreaElement>("export-data");
  image.hidden = json !== null; data.hidden = json === null;
  element("export-label").hidden = json === null;
  element("export-copy").hidden = json === null;
  element("export-link").hidden = json !== null;
  element("export-caption").hidden = json !== null;
  element("export-url-label").hidden = json !== null;
  element("export-url").hidden = json !== null;
  exportedLink = sharing?.link ?? ""; exportedCaption = sharing?.caption ?? "";
  element<HTMLInputElement>("export-url").value = exportedLink;
  if (json !== null) { data.value = json; image.removeAttribute("src"); }
  else { image.src = exportUrl; data.value = ""; }
  element("share-selection").hidden = json !== null;
  element("export-title").textContent = json === null ? "Share results" : "Source data";
  element("export-description").textContent = json === null ? "Download the image or copy its link." : "Save this file to reproduce the report offline.";
  const link = element<HTMLAnchorElement>("export-download"); link.href = exportUrl; link.download = filename;
  buttonIcon(link, json === null ? "Download image" : "Download JSON", "download");
  if (!exportDialog.open) { exportDialog.showModal(); exportDialog.scrollTop = 0; if (json === null) celebrate(exportDialog); }
}
exportDialog.addEventListener("close", () => { ++shareGeneration; });
element("export-close").addEventListener("click", () => { ++shareGeneration; exportDialog.close(); });
element("export-link").addEventListener("click", async () => {
  element("export-description").textContent = await copyText(exportedLink) ? "Results link copied. Your award selection comes with it." : "The browser could not copy the link. Copy it from the field below.";
});
element("export-caption").addEventListener("click", async () => {
  element("export-description").textContent = await copyText(`${exportedCaption}\n${exportedLink}`) ? "Results copied as text. Ready for the group chat." : "The browser could not copy the text. You can still download the image.";
});
element("export-copy").addEventListener("click", async () => {
  const copied = await copyText(element<HTMLTextAreaElement>("export-data").value);
  element("export-description").textContent = copied ? "JSON copied. It includes the human-readable summary and source facts." : "The browser could not copy this file. Use Download JSON, or select the text and copy it.";
});
element("json-button").addEventListener("click", () => {
  if (!current) return;
  ++shareGeneration;
  const json = JSON.stringify(current, null, 2);
  previewExport(new Blob([json], { type: "application/json" }), `${current.repository.replace("/", "-")}-repo-lore.json`, json);
});
function fit(ctx: CanvasRenderingContext2D, value: string, width: number): string {
  if (ctx.measureText(value).width <= width) return value;
  let clipped = value;
  while (clipped.length && ctx.measureText(`${clipped}…`).width > width) clipped = clipped.slice(0, -1);
  return `${clipped}…`;
}
function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number, maxLines: number): void {
  const words = text.split(/\s+/); let line = ""; let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(next).width > width && line) {
      if (lines === maxLines - 1) { ctx.fillText(fit(ctx, `${line} ${words.slice(i).join(" ")}`, width), x, y); return; }
      ctx.fillText(line, x, y); y += lineHeight; lines++; line = words[i];
    } else line = next;
  }
  if (line) ctx.fillText(fit(ctx, line, width), x, y);
}
function drawIcon(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, size: number): void {
  const data = ICONS[name]; if (!data) return;
  const [, , width, height] = data.viewBox.split(" ").map(Number);
  const scale = size / Math.max(width, height);
  ctx.save(); ctx.translate(x + (size - width * scale) / 2, y + (size - height * scale) / 2);
  ctx.scale(scale, scale); ctx.fill(new Path2D(data.path)); ctx.restore();
}
function resultsLink(report: Report, ids: readonly string[]): string {
  const link = new URL(window.location.pathname, window.location.origin);
  link.searchParams.set("repo", report.repository);
  if (new URL(window.location.href).searchParams.get("example") === "1") link.searchParams.set("example", "1");
  link.searchParams.set("awards", ids.join(","));
  if (ids.length === 1) link.searchParams.set("card", ids[0]);
  return link.href;
}
async function drawResults(report: Report): Promise<void> {
  const run = ++shareGeneration;
  const ids = [...selectedIds];
  const selected = shareAwards(report, ids);
  try { await Promise.all([document.fonts.load('700 44px "DM Sans"'), document.fonts.load('400 20px "DM Sans"'), document.fonts.load('400 18px "DM Mono"')]); }
  catch { /* System fallbacks still produce readable results. */ }
  const dark = document.documentElement.dataset.theme === "dark";
  const styles = getComputedStyle(document.documentElement);
  const token = (name: string): string => styles.getPropertyValue(name).trim();
  const palette = { paper: token("--paper"), ink: token("--ink"), muted: token("--muted"), green: token("--brand-green") };
  const fills = Object.fromEntries(report.awards.map(award => [award.id, token(`--award-${award.id}`)]));
  const logo = new Image(); logo.src = `./assets/polylane${dark ? "-white" : ""}.svg`;
  try { await logo.decode(); } catch { /* Attribution text remains available. */ }
  const deck = new Image(); deck.src = `data:image/svg+xml,${encodeURIComponent(deckArtwork(palette.green))}`;
  try { await deck.decode(); } catch { /* The heading remains readable without artwork. */ }
  if (run !== shareGeneration) return;
  const artwork = await Promise.all(selected.map(async award => {
    const accent = ["delete", "comments", "oldest"].includes(award.id) ? "#AB69EB" : palette.green;
    const image = new Image(); image.src = `data:image/svg+xml,${encodeURIComponent(awardArtwork(award.id, accent))}`;
    try { await image.decode(); } catch { /* Text still identifies every award. */ } return image;
  }));
  if (run !== shareGeneration) return;
  const columns = Math.min(3, selected.length), rows = Math.ceil(selected.length / columns);
  const cardHeight = columns === 1 ? 420 : 530;
  const footerY = 200 + rows * (cardHeight + 20);
  const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = footerY + 235;
  const ctx = canvas.getContext("2d");
  if (!ctx) { messages.textContent = "This browser could not create an image. Copy the results as text instead."; return; }
  ctx.fillStyle = palette.paper; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = palette.ink; ctx.font = '400 18px "DM Mono"'; ctx.fillText("REPO LORE / THE CARDS ARE IN", 54, 55);
  if (deck.naturalWidth) ctx.drawImage(deck, 394, 21, 60, 49);
  ctx.font = '700 44px "DM Sans"'; ctx.fillText(fit(ctx, report.repository, 1092), 54, 118);
  ctx.font = '400 18px "DM Sans"'; ctx.fillStyle = palette.muted;
  ctx.fillText(`90-day snapshot · ${report.coverage.mergedObserved} observed merges · ${report.coverage.detailsRead} PR diffs inspected`, 54, 157);
  const gap = 20, width = (1092 - gap * (columns - 1)) / columns;
  selected.forEach((award, i) => {
    const x = 54 + (i % columns) * (width + gap), y = 198 + Math.floor(i / columns) * (cardHeight + gap);
    const contentWidth = width - 48;
    const accent = ["delete", "comments", "oldest"].includes(award.id) ? "#AB69EB" : palette.green;
    ctx.save(); ctx.shadowColor = "#00000024"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 12;
    const surface = ctx.createLinearGradient(x, y, x + width, y + cardHeight);
    surface.addColorStop(0, fills[award.id] || palette.paper); surface.addColorStop(1, palette.paper);
    ctx.fillStyle = surface; ctx.beginPath(); ctx.roundRect(x, y, width, cardHeight, 22); ctx.fill(); ctx.restore();
    ctx.strokeStyle = `${accent}45`; ctx.lineWidth = 1; ctx.stroke();
    ctx.save(); ctx.fillStyle = accent; ctx.globalAlpha = .055;
    drawIcon(ctx, award.id, x + width - 170, y + cardHeight - 180, 180); ctx.restore();
    ctx.fillStyle = palette.ink; ctx.font = '400 15px "DM Mono"'; ctx.fillText(award.name.toUpperCase(), x + 24, y + 42);
    const artSize = columns === 1 ? 150 : 130;
    if (artwork[i].naturalWidth) ctx.drawImage(artwork[i], columns === 1 ? x + width - 188 : x + 14, y + 54, artSize, artSize);
    ctx.font = '700 30px "DM Sans"'; wrap(ctx, award.headline, x + 24, y + (columns === 1 ? 125 : 207), columns === 1 ? contentWidth - 180 : contentWidth, 35, 2);
    ctx.font = '700 22px "DM Sans"'; wrap(ctx, award.value || "No winner this round", x + 24, y + (columns === 1 ? 200 : 282), contentWidth, 28, 2);
    ctx.font = '400 18px "DM Sans"'; wrap(ctx, award.description, x + 24, y + (columns === 1 ? 260 : 337), contentWidth, 24, columns === 1 ? 2 : 5);
    ctx.fillStyle = palette.muted; ctx.font = '400 14px "DM Sans"';
    wrap(ctx, `Scope: ${award.scope}`, x + 24, y + cardHeight - 64, contentWidth, 18, 4);
  });
  ctx.fillStyle = palette.ink; ctx.font = '700 28px "DM Sans"'; ctx.fillText("Your repo has lore.", 54, footerY + 23);
  ctx.font = '400 19px "DM Sans"'; ctx.fillStyle = palette.muted;
  wrap(ctx, report.summary, 54, footerY + 59, 1092, 26, 5);
  ctx.font = '400 15px "DM Mono"'; const attribution = `Read ${report.capturedAt.slice(0, 10)} · Created at repolore.fun by`;
  ctx.fillText(attribution, 54, footerY + 207);
  const logoX = 54 + ctx.measureText(attribution).width + 14;
  if (logo.naturalWidth) ctx.drawImage(logo, logoX, footerY + 189, 137, 27);
  else { ctx.font = '700 18px "DM Sans"'; ctx.fillText("Polylane", logoX, footerY + 207); }
  canvas.toBlob(blob => {
    if (run !== shareGeneration) return;
    if (blob) previewExport(blob, `${report.repository.replace("/", "-")}-repo-lore-${ids.join("-")}.png`, null,
      { link: resultsLink(report, ids), caption: shareCaption(report, ids) });
    else messages.textContent = "The image could not be saved. Copy the results as text instead.";
  }, "image/png");
}
async function showShareCard(report: Report, selection?: string | readonly string[]): Promise<void> {
  shareReport = report;
  selectedIds = shareAwards(report, selection).map(award => award.id);
  element("selection-message").textContent = "";
  const choices = report.awards.map(award => {
    const label = document.createElement("label"); label.className = "award-choice";
    const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.value = award.id;
    checkbox.checked = selectedIds.includes(award.id); checkbox.setAttribute("aria-label", award.name);
    checkbox.addEventListener("change", () => {
      const ids = [...element("share-options").querySelectorAll<HTMLInputElement>("input:checked")].map(input => input.value);
      if (!ids.length) { checkbox.checked = true; element("selection-message").textContent = "Keep at least one award in the mix."; return; }
      selectedIds = ids; element("selection-message").textContent = "";
      if (shareReport) void drawResults(shareReport);
    });
    label.append(checkbox, icon(award.id), document.createTextNode(award.name)); return label;
  });
  element("share-options").replaceChildren(...choices);
  await drawResults(report);
}
element("card-button").addEventListener("click", () => { if (current) void showShareCard(current); });
const initial = new URL(window.location.href).searchParams.get("repo");
if (initial) void load(initial, new URL(window.location.href).searchParams.get("example") === "1", new URL(window.location.href).searchParams.get("card") ?? undefined, new URL(window.location.href).searchParams.get("awards") ?? undefined);
if (new URL(window.location.href).searchParams.get("preview") === "loading") {
  loading.hidden = false; element("loading-whimsy").textContent = "Shuffling the repo lore…";
  element("progress-text").textContent = "Loading animation preview — no GitHub request is running.";
}
