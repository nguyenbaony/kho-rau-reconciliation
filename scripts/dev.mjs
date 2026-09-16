// Dev runner: spawns BOTH sub-projects concurrently — no `concurrently` dep (KISS).
//
//   Web (UI + remoteEntry)  → `next dev --webpack` on 3001 (proxies /api
//                             to Express via next.config rewrites)
//   API (Express /api only) → `tsx watch src/server.ts` on 3001+1000
//                             (internal; never used directly by the browser)
//
// In prod a SINGLE Express process serves web/out + /api (see api/src/server.ts).
// Dev diverges intentionally (also how demo01 works).
//
// Usage: pnpm dev  (from the module root — runs web + api together)

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
/** module root (parent of scripts/) */
const root = resolve(here, "..");
/** api/ root */
const apiDir = resolve(root, "api");
/** web/ root */
const webDir = resolve(root, "web");

// The public-facing dev port (== 3001 in the template; may be overridden).
const PORT = Number(process.env.PORT ?? "3001");
// Express dev port: internal only — the browser hits it only via Next rewrites.
// MUST match api/src/env.ts (which derives PORT+1000 in dev) and
// web/next.config.ts (the rewrite destination). Used here for the log only.
const API_DEV_PORT = PORT + 1000;

// ── helpers ──────────────────────────────────────────────────────────────────

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`\n[dev] \`${cmd} ${args.join(" ")}\` failed in ${cwd}`);
    process.exit(r.status ?? 1);
  }
}

// ── 1. Auto-install deps if missing ──────────────────────────────────────────

if (!existsSync(resolve(webDir, "node_modules"))) {
  console.log("[dev] installing web/ deps…");
  run("pnpm", ["install"], webDir);
}
if (!existsSync(resolve(apiDir, "node_modules"))) {
  console.log("[dev] installing api/ deps…");
  run("pnpm", ["install"], apiDir);
}

// ── 2. Spawn processes ───────────────────────────────────────────────────────

console.log(`[dev] starting web on :${PORT} and api on :${API_DEV_PORT}…`);

const procs = [
  // Next dev: serves the UI + remoteEntry.js with HMR.
  // Rewrites in next.config.ts forward /api → http://localhost:<API_DEV_PORT>
  // so the browser never needs CORS from a different port.
  spawn(
    "pnpm",
    ["exec", "next", "dev", "--webpack", "-p", String(PORT)],
    { cwd: webDir, stdio: "inherit" },
  ),

  // Express dev: answers /api only, on the INTERNAL port. We ONLY set
  // NODE_ENV=development — env.ts then derives the listen port as PORT+1000
  // (env.ts is the single source of truth, so `pnpm dev:api` binds the same
  // internal port and never collides with the frontend on :${PORT}). Injecting
  // PORT here would double-add the +1000 offset. NODE_ENV!=production also makes
  // ASSET CORS use "*" (cross-origin assets are non-credentialed in dev). The
  // JSON API needs no CORS at all — in production it is reached through the
  // shell's server-side proxy, never straight from a browser.
  spawn(
    "pnpm",
    ["exec", "tsx", "watch", "src/server.ts"],
    {
      cwd: apiDir,
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "development",
        // Standalone dev has no shell, so no shell-issued JWT exists to verify.
        // Without this every /api call would 401 forever — and the likely "fix"
        // an agent reaches for is weakening auth, which is exactly the failure
        // to avoid. The bypass is structurally inert in production: env.ts
        // guards it with !IS_PROD (see AUTH_DEV_BYPASS).
        AUTH_DEV_BYPASS: process.env.AUTH_DEV_BYPASS ?? "1",
      },
    },
  ),
];

// ── 3. Signal handling ───────────────────────────────────────────────────────

let shuttingDown = false;

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const p of procs) {
    if (!p.killed) p.kill("SIGTERM");
  }
  process.exit(code ?? 0);
}

// If EITHER child dies → shut down the other and exit.
for (const p of procs) {
  p.on("exit", (code) => {
    if (!shuttingDown) {
      console.error(`[dev] a subprocess exited (code=${code}), shutting down…`);
    }
    shutdown(code ?? 0);
  });
}

// Forward Ctrl-C / kill to both children.
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
