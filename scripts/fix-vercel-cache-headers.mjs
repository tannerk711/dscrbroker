/**
 * Postbuild: make the immutable cache header on /_astro/* actually apply.
 *
 * The @astrojs/vercel adapter emits the right rule
 *   { src: "^/_astro/(.*)$", headers: { cache-control: "public, max-age=31536000, immutable" }, continue: true }
 * but places it AFTER { handle: "filesystem" } in .vercel/output/config.json.
 * Vercel serves matching static files during the filesystem phase, so a header
 * route that comes after it never runs, and production served every hashed
 * asset with max-age=0 (verified live 2026-08-18). Header routes must sit
 * BEFORE the filesystem handler to attach to static responses.
 *
 * This script moves (or inserts) that rule ahead of the filesystem handle.
 * Runs as part of `npm run build`. Fails the build loudly if the config is
 * missing so a silent regression cannot ship.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const configPath = join(root, '.vercel', 'output', 'config.json');

const config = JSON.parse(readFileSync(configPath, 'utf8'));
const routes = config.routes || [];

const isAstroHeaderRoute = (r) =>
  typeof r?.src === 'string' && r.src.includes('/_astro/') && r.headers && r.continue === true;

const fsIndex = routes.findIndex((r) => r?.handle === 'filesystem');
if (fsIndex === -1) {
  throw new Error('[fix-vercel-cache-headers] No { handle: "filesystem" } route found; adapter output changed, review this script.');
}

// Pull the adapter's rule (wherever it is) or build the canonical one.
const existingIndex = routes.findIndex(isAstroHeaderRoute);
const headerRoute =
  existingIndex !== -1
    ? routes.splice(existingIndex, 1)[0]
    : {
        src: '^/_astro/(.*)$',
        headers: { 'cache-control': 'public, max-age=31536000, immutable' },
        continue: true,
      };

// Re-find the filesystem handle after the splice, then insert ahead of it.
const insertAt = routes.findIndex((r) => r?.handle === 'filesystem');
routes.splice(insertAt, 0, headerRoute);
config.routes = routes;

writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('[fix-vercel-cache-headers] Immutable /_astro/* cache rule now precedes the filesystem handler.');
