#!/usr/bin/env node
// Rename this template after forking it.
//
//   node scripts/rename-fork.mjs <new-project-name>     apply
//   node scripts/rename-fork.mjs                        dry run (list changes)
//
// Most naming is derived at BUILD time from CI_PROJECT_NAME (K8s names, ingress
// path, origins, the Module Federation container name), so this script only
// touches the human-facing leftovers: package names, titles, docs and the
// committed .env. Files that derive names automatically are deliberately SKIPPED
// — hardcoding a fork's name into them would break the CI derivation.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const TEMPLATE_SLUG = "workspace-template";
const TEMPLATE_PASCAL = "WorkspaceTemplate";

// Explicit allowlist — never sweep the whole tree, that is how templates get
// mangled. Add a file here if a fork should have it renamed.
const FILES = [
  "package.json",
  "web/package.json",
  "api/package.json",
  ".env",
  ".env.example",
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  ".cursorrules",
  ".github/copilot-instructions.md",
  ".antigravity/rules.md",
  "web/app/layout.tsx",
  "web/lib/dashboard-base.ts",
  "web/lib/federation-name.ts",
  ".context/graph_snapshot.json",
  ".context/api_contracts.md",
  ".context/coding_guidelines.md",
  ".context/federation_architecture.md",
];

// These derive the name at build time from CI_PROJECT_NAME. Leave them alone.
const SKIPPED = [
  "web/next.config.ts  (federation name comes from lib/federation-name.ts)",
  ".gitlab-ci.yml      (derives APP_SLUG / origins from CI_PROJECT_NAME)",
  ".build/k8s/**       (CI substitutes __APP_SLUG__ / __INGRESS_BASE_PATH__)",
];

function toPascal(slug) {
  return slug
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

function fail(msg) {
  console.error(`[rename] ${msg}`);
  process.exit(1);
}

const slug = process.argv[2];
const dryRun = !slug;

if (slug && !/^[a-z][a-z0-9-]{1,48}$/.test(slug)) {
  fail(
    `invalid name "${slug}". Use lowercase letters, digits and hyphens, ` +
      `starting with a letter (2-49 chars) — it becomes a URL path and a K8s name.`,
  );
}

// Refuse to run on a dirty tree so the diff stays reviewable and revertable.
if (!dryRun) {
  try {
    const status = execFileSync("git", ["status", "--porcelain"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    if (status.trim()) {
      fail("working tree is dirty — commit or stash first so this diff is reviewable.");
    }
  } catch (err) {
    if (err?.status === 1 || err?.code === "ENOENT") {
      console.warn("[rename] warning: could not check git status; continuing.");
    } else {
      throw err;
    }
  }
}

const pascal = slug ? toPascal(slug) : "<NewName>";
const changes = [];

for (const rel of FILES) {
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) continue;
  const before = readFileSync(abs, "utf8");
  const hits =
    before.split(TEMPLATE_SLUG).length - 1 + (before.split(TEMPLATE_PASCAL).length - 1);
  if (hits === 0) continue;

  // In a dry run there is no target name yet, so only the count is meaningful.
  const after = slug
    ? before.split(TEMPLATE_SLUG).join(slug).split(TEMPLATE_PASCAL).join(pascal)
    : before;
  changes.push({ rel, abs, after, hits });
}

if (dryRun) {
  console.log("[rename] DRY RUN — pass a name to apply:  node scripts/rename-fork.mjs my-app\n");
  console.log("Would update:");
  for (const c of changes) console.log(`  ${c.rel}  (${c.hits} occurrence(s))`);
  console.log("\nDeliberately skipped (names derive from CI_PROJECT_NAME):");
  for (const s of SKIPPED) console.log(`  ${s}`);
  process.exit(0);
}

for (const c of changes) writeFileSync(c.abs, c.after, "utf8");

console.log(`[rename] ${TEMPLATE_SLUG} → ${slug}  (${TEMPLATE_PASCAL} → ${pascal})`);
for (const c of changes) console.log(`  updated ${c.rel}`);
console.log("\nSkipped on purpose (names derive from CI_PROJECT_NAME):");
for (const s of SKIPPED) console.log(`  ${s}`);
console.log(`
Next steps:
  1. Set OIDC_ISSUER in .env — the API refuses to boot in production without it.
  2. Run \`pnpm verify\` (lint + typecheck + tests + graph). It is the same gate
     the Docker build enforces, and a red gate blocks the deploy.
  3. Ask a shell admin to register this module's baseUrl in
     Settings → Modules Management. The federation name is derived from the CI
     project name — see web/lib/federation-name.ts.
`);
