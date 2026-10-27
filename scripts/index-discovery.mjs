import { parseRepository } from "../.server-dist/src/core.js";

/**
 * Read the public top-repo shortlist one page at a time. GitHub can time out a
 * search request and answer with `incomplete_results: true`; read that page
 * again before giving up so a slow search does not abort the whole refresh.
 * @param {{limit:number, read:(path:string)=>Promise<any>, wait:(ms:number)=>Promise<void>}} options
 * @returns {Promise<string[]>}
 */
export async function discoverRepositories(options) {
	const selected = [];
	for (let page = 1; page <= Math.ceil(options.limit / 100); page++) {
		const query = new URLSearchParams({
			q: "is:public fork:false archived:false stars:>500",
			sort: "stars",
			order: "desc",
			per_page: "100",
			page: String(page),
		});
		let data;
		for (let attempt = 0; ; attempt++) {
			data = await options.read("/search/repositories?" + query);
			if (!data.incomplete_results && Array.isArray(data.items)) break;
			if (attempt >= 3) throw new Error("Incomplete discovery.");
			await options.wait(5000 * (attempt + 1));
		}
		for (const row of data.items)
			if (row.private === false && !row.fork && !row.archived)
				selected.push(parseRepository(row.full_name));
	}
	return [...new Set(selected)].slice(0, options.limit);
}
