import test from "node:test";
import assert from "node:assert/strict";
import { buildReport, type Award, type Report } from "../src/core.js";
import { shareAwards, shareCaption } from "../src/share.js";

function fixture(): Report {
  const report = buildReport({ repository: "test/repo", description: "", now: Date.parse("2026-10-06T00:00:00Z"),
    closed: [], open: [], details: [], periodComplete: true, notes: [], contributingUrl: null,
    requests: 0, openKnown: true, detailRequested: 0 });
  const award: Award = { id: "delete", name: "Delete Club", icon: "−", status: "observed", headline: "@person",
    value: "74 lines deleted", description: "It also added 289 lines.", scope: "Ten inspected PRs; all file types.",
    evidence: [{ number: 12, title: "A real record", url: "https://github.com/test/repo/pull/12" }] };
  report.awards[1] = award;
  return report;
}
test("individual sharing selects only the requested award", () => {
  const selected = shareAwards(fixture(), "delete");
  assert.equal(selected.length, 1); assert.equal(selected[0].id, "delete");
  const caption = shareCaption(fixture(), "delete");
  assert.match(caption, /74 lines deleted/); assert.match(caption, /added 289/);
  assert.match(caption, /Ten inspected PRs/); assert.match(caption, /pull\/12/); assert.match(caption, /Read 2026/);
  assert.doesNotMatch(caption, /Merge Machine|Comment Magnet/);
});
test("unknown card IDs cannot silently share a different award", () => {
  assert.throws(() => shareAwards(fixture(), "not-a-card"), /not part of the report/);
});
test("combined sharing preserves the three-card overview", () => {
  assert.equal(shareAwards(fixture()).length, 3);
});

test("custom selection preserves report order and carries the summary and evidence", () => {
  const report = fixture();
  const ids = ["fast", "delete", "cast", "delete"];
  assert.deepEqual(shareAwards(report, ids).map(award => award.id), ["delete", "cast", "fast"]);
  const caption = shareCaption(report, ids);
  assert.ok(caption.includes(report.summary));
  assert.match(caption, /pull\/12/);
  assert.match(caption, /Created at repolore.fun by Polylane/);
  assert.doesNotMatch(caption, /Comment Magnet|Merge Machine/);
  assert.equal(shareAwards(report, report.awards.map(award => award.id)).length, 6);
});
test("empty or unknown selections cannot silently generate misleading results", () => {
  assert.throws(() => shareAwards(fixture(), []), /at least one/);
  assert.throws(() => shareCaption(fixture(), ["delete", "missing"]), /not part of the report/);
});
