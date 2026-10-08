/**
 * Postbuild: trailing-slash 308s scoped to the page families.
 *
 * astro.config.mjs sets trailingSlash: 'always'. @astrojs/vercel turns that
 * into a GLOBAL redirect at the top of .vercel/output/config.json routes
 * (^/((?:[^/]+/)*[^/\.]+)$ -> /$1/, 308), which would also 308 the form's
 * POST to /api/lead. This script removes every global trailing-slash rule and
 * inserts rules limited to the page families plus the top-level pages:
 *
 *   /states/texas            -> /states/texas/
 *   /states/arizona/buckeye  -> /states/arizona/buckeye/
 *   /programs/standard-dscr  -> /programs/standard-dscr/
 *   /analyze                 -> /analyze/
 *
 * Paths with a dot (/states/texas/index.html, assets) and /api/* never match.
 * Fails the build if any 308 route would still match /api/lead.
 * Runs as part of `npm run build` after fix-vercel-cache-headers.mjs.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const configPath = join(root, '.vercel', 'output', 'config.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));
let routes = config.routes || [];

const FAMILIES = 'programs|states|learn|dscr-loans';
const TOP_LEVEL = 'programs|states|learn|dscr-loans|analyze|qualify|privacy-policy|terms-of-service|thank-you';
const scoped = [
  { src: `^/(${FAMILIES})/([^.]+[^/.])$`, headers: { Location: '/$1/$2/' }, status: 308 },
  { src: `^/(${TOP_LEVEL})$`, headers: { Location: '/$1/' }, status: 308 },
];

// Drop the adapter's global trailing-slash redirect(s): any 308 to /$1/ that is
// not one of ours.
const isOurs = (r) => scoped.some((s) => s.src === r.src);
const isGlobalSlash = (r) => r?.status === 308 && r?.headers?.Location === '/$1/' && !isOurs(r);
const removed = routes.filter(isGlobalSlash);
routes = routes.filter((r) => !isGlobalSlash(r) && !isOurs(r));
routes.unshift(...scoped);

// The invariant that matters: no redirect may touch the lead endpoint.
const PROBES = ['/api/lead', '/api/analyze-property', '/states/texas/index.html', '/_astro/x.css', '/sitemap-index.xml'];
for (const r of routes) {
  if (typeof r?.src !== 'string' || !r?.status || r.status < 300 || r.status > 399) continue;
  const re = new RegExp(r.src);
  const hit = PROBES.find((p) => re.test(p));
  if (hit) throw new Error(`[fix-vercel-redirects] redirect route ${r.src} matches ${hit}; refusing to ship`);
}
for (const [path, expected] of [
  ['/states/texas', '/states/texas/'],
  ['/states/arizona/buckeye', '/states/arizona/buckeye/'],
  ['/programs/standard-dscr', '/programs/standard-dscr/'],
  ['/analyze', '/analyze/'],
]) {
  const r = scoped.find((s) => new RegExp(s.src).test(path));
  const got = r && path.replace(new RegExp(r.src), r.headers.Location);
  if (got !== expected) throw new Error(`[fix-vercel-redirects] ${path} -> ${got}, expected ${expected}`);
}

config.routes = routes;
writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log(`[fix-vercel-redirects] removed ${removed.length} global trailing-slash route(s), inserted ${scoped.length} scoped 308 rules; /api/lead untouched.`);
