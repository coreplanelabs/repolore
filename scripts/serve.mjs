import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const files = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/core.js", ["core.js", "text/javascript; charset=utf-8"]],
  ["/share.js", ["share.js", "text/javascript; charset=utf-8"]],
  ["/icons.js", ["icons.js", "text/javascript; charset=utf-8"]],
  ["/theme.js", ["theme.js", "text/javascript; charset=utf-8"]],
  ["/favicon.svg", ["favicon.svg", "image/svg+xml"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/examples/pytest-dev-pytest.json", ["examples/pytest-dev-pytest.json", "application/json; charset=utf-8"]],
  ["/examples/vitejs-vite.json", ["examples/vitejs-vite.json", "application/json; charset=utf-8"]]
]);
for (const name of ["dm-sans-latin-400-normal.woff", "dm-sans-latin-500-normal.woff", "dm-sans-latin-600-normal.woff", "dm-sans-latin-700-normal.woff", "dm-mono-latin-400-normal.woff"]) files.set(`/assets/${name}`, [`assets/${name}`, "font/woff"]);
for (const name of ["polylane.svg", "polylane-white.svg"]) files.set(`/assets/${name}`, [`assets/${name}`, "image/svg+xml"]);
const port = Number(process.env.REPO_ARCADE_PORT ?? 4178);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Use a port between 1024 and 65535.");
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  const file = files.get(pathname);
  if (!file || (request.method !== "GET" && request.method !== "HEAD")) {
    response.writeHead(404, { "Content-Type": "text/plain" }); response.end("Not found"); return;
  }
  try {
    const body = await readFile(new URL(`../dist/${file[0]}`, import.meta.url));
    response.writeHead(200, {
      "Content-Type": file[1], "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'self'; connect-src 'self' https://api.github.com; style-src 'self'; script-src 'self'; img-src 'self' blob: data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(503, { "Content-Type": "text/plain" }); response.end("Run the build before starting Repo Lore.");
  }
});
server.listen(port, "127.0.0.1", () => console.log(`Local: http://127.0.0.1:${port}`));
