import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
// @ts-expect-error JS plugin alongside the TS vite config
import { pwaPlugin } from "./scripts/pwa-plugin.mjs";
// @ts-expect-error JS plugin alongside the TS vite config
import { appEnvPlugin } from "./scripts/app-env-plugin.mjs";
import { isMigrationFile } from "./scripts/migration-plan.mjs";

/** The files `src/lib/db.ts` globs — same directory, same non-recursive scope. */
function hasGlobbedMigrations(root: string): boolean {
  try {
    return readdirSync(join(root, "migrations")).some(isMigrationFile);
  } catch {
    return false;
  }
}

/**
 * Finish PGLite bootstrap during dev-server setup (before traffic). Vite awaits
 * async `configureServer` hooks. Production: `src/lib/db` kicks `ensureDbReady`
 * on import.
 *
 * Vite awaiting the hook puts this on time-to-first-render, so an app with no
 * migrations — no schema to apply — skips it entirely rather than paying for a
 * PGLite instance it never queries.
 */
function pgliteBootstrapPlugin(): Plugin {
  return {
    name: "app-builder:pglite-bootstrap",
    apply: "serve",
    async configureServer(server) {
      if (!hasGlobbedMigrations(server.config.root)) return;
      try {
        const mod = (await server.ssrLoadModule("/src/lib/db.ts")) as {
          ensureDbReady?: () => Promise<void>;
        };
        if (typeof mod.ensureDbReady === "function") {
          await mod.ensureDbReady();
        }
      } catch (err) {
        console.error("[app-builder] DB bootstrap failed:", err);
        throw err;
      }
    },
  };
}

/*
 * 8080 for dev and 8081 for preview, unless `PORT` says otherwise.
 *
 * Those two numbers are a convention rather than a requirement: `qa:ui`,
 * `qa:live` and `check:auth` each take a base URL as an argument and only fall
 * back to 8080, so nothing breaks when the server lands elsewhere. Nothing here
 * needs a fixed port for an OAuth callback, a webhook, or a CORS allowlist.
 *
 * `PORT` exists because these were pinned with `strictPort`, so a second
 * project already holding 8080 could not be worked around — the launcher
 * assigns a free port and Vite reads neither `--port` overrides nor `PORT` on
 * its own. Defaults unchanged, so every existing habit still works.
 *
 * `strictPort` stays: with a port chosen deliberately, a silent drift to some
 * other number is worse than a refusal to start.
 */
const port = (fallback: number) => Number(process.env.PORT) || fallback;

export default defineConfig(({ command, isPreview }) => ({
  server: {
    host: "0.0.0.0",
    port: port(8080),
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: port(8081),
    strictPort: true,
  },
  resolve: { tsconfigPaths: true },
  optimizeDeps: {
    exclude: ["@instrument/ui", "@instrument/formula"],
  },
  plugins: [
    pgliteBootstrapPlugin(),
    // Dev-only /__app-env, read by scripts/check-auth-invariant.mjs.
    appEnvPlugin(),
    // PWA head + ?install=1 tutorial page; runs before Start/Nitro.
    pwaPlugin(),
    tailwindcss(),
    tanstackStart(),
    ...(command === "build" || isPreview
      ? [
          nitro({
            preset: "vercel",
            // Auto-registers server/middleware/* (the PWA install page +
            // manifest + head-tag middleware). Nitro v3 defaults serverDir to
            // false, so removing this silently unwires /?install=1 on deploys.
            serverDir: "./server",
          }),
        ]
      : []),
    viteReact(),
  ],
}));
