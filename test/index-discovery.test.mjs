import test from "node:test";
import assert from "node:assert/strict";
import { discoverRepositories } from "../scripts/index-discovery.mjs";

const row = (full_name, extra = {}) => ({
	full_name,
	private: false,
	fork: false,
	archived: false,
	...extra,
});

test("a timed-out search page is read again instead of aborting discovery", async () => {
	let reads = 0;
	const waits = [];
	const selected = await discoverRepositories({
		limit: 100,
		read: async () => {
			reads++;
			if (reads === 1) return { incomplete_results: true, items: [] };
			return {
				incomplete_results: false,
				items: [
					row("sample/r0"),
					row("secret/repo", { private: true }),
					row("sample/fork", { fork: true }),
					row("sample/archived", { archived: true }),
				],
			};
		},
		wait: async (ms) => waits.push(ms),
	});
	assert.deepEqual(selected, ["sample/r0"]);
	assert.equal(reads, 2);
	assert.deepEqual(waits, [5000]);
});

test("discovery stops when a page stays incomplete after the bounded retries", async () => {
	let reads = 0;
	const waits = [];
	await assert.rejects(
		discoverRepositories({
			limit: 100,
			read: async () => {
				reads++;
				return { incomplete_results: true, items: [] };
			},
			wait: async (ms) => waits.push(ms),
		}),
		/Incomplete discovery\./,
	);
	assert.equal(reads, 4);
	assert.deepEqual(waits, [5000, 10000, 15000]);
});

test("discovery reads each page once when results are complete", async () => {
	let reads = 0;
	const requested = [];
	const selected = await discoverRepositories({
		limit: 200,
		read: async (path) => {
			reads++;
			requested.push(new URLSearchParams(path.split("?")[1]).get("page"));
			const page = Number(new URLSearchParams(path.split("?")[1]).get("page"));
			return {
				incomplete_results: false,
				items: Array.from({ length: 2 }, (_, id) =>
					row(`sample/p${page}-r${id}`),
				),
			};
		},
		wait: async () => {
			throw new Error("a complete page must not wait");
		},
	});
	assert.equal(reads, 2);
	assert.deepEqual(requested, ["1", "2"]);
	assert.deepEqual(selected, [
		"sample/p1-r0",
		"sample/p1-r1",
		"sample/p2-r0",
		"sample/p2-r1",
	]);
});
