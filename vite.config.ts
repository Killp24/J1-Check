import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import type { Connect, Plugin, PreviewServer, ViteDevServer } from "vite";
import { defineConfig } from "vitest/config";

function basePath(): string {
  const raw = process.env.BASE_PATH || "/";
  if (raw === "/") return "/";
  const withLead = raw.startsWith("/") ? raw : `/${raw}`;
  return withLead.endsWith("/") ? withLead : `${withLead}/`;
}

function attachOddsCsv(middlewares: Connect.Server, file: string): void {
  middlewares.use((req, res, next) => {
    const pathname = req.url?.split("?")[0] ?? "";
    if (pathname !== "/j1_odds.csv" && !pathname.endsWith("/j1_odds.csv")) {
      next();
      return;
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    fs.createReadStream(file).pipe(res);
  });
}

function j1OddsCsv(): Plugin {
  const file = path.resolve("j1_odds.csv");
  return {
    name: "j1-odds-csv",
    configureServer(server: ViteDevServer) {
      attachOddsCsv(server.middlewares, file);
    },
    configurePreviewServer(server: PreviewServer) {
      attachOddsCsv(server.middlewares, file);
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "j1_odds.csv",
        source: fs.readFileSync(file, "utf-8"),
      });
    },
  };
}

export default defineConfig({
  base: basePath(),
  plugins: [react(), j1OddsCsv()],
  server: { host: "0.0.0.0", port: 5173, strictPort: true },
  preview: { host: "0.0.0.0", port: 4173, strictPort: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
