/**
 * Postbuild: split @astrojs/sitemap's single sitemap-0.xml into four family
 * sitemaps with a per-URL <lastmod>, and rewrite sitemap-index.xml to point at
 * them. Runs as part of `npm run build` after the Astro build.
 *
 *   sitemap-core.xml    home, programs index + pages, analyze, qualify, states
 *                       index, learn hub, dscr-loans hub, legal
 *   sitemap-states.xml  /states/<state>/
 *   sitemap-cities.xml  /states/<state>/<city>/
 *   sitemap-learn.xml   /learn/<slug>/ and /dscr-loans/<slug>/
 *
 * lastmod sources (the content's last real change, never the build time):
 *   learn + scenario pages: MDX frontmatter updatedDate ?? publishDate
 *   everything else: src/data/lastmod.json, the git commit date per source
 *   file, written locally by scripts/lastmod-manifest.mjs (Vercel's shallow
 *   clone has no history). A URL with no known date gets no <lastmod>.
 *
 * The /lp/ and /thank-you exclusions stay in astro.config.mjs (the integration
 * filter); this script also refuses them defensively. Fails the build loudly
 * when the integration's output is missing or malformed.
 */
import { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const SITE = 'https://dscrbroker.com';
const read = (rel) => readFileSync(join(root, rel), 'utf8');

// ---------- locate the integration's output ----------
const outDir = ['.vercel/output/static', 'dist']
  .map((d) => join(root, d))
  .find((d) => existsSync(join(d, 'sitemap-0.xml')));
if (!outDir) throw new Error('[build-sitemaps] sitemap-0.xml not found in .vercel/output/static or dist; did @astrojs/sitemap run?');
const extraChunks = readdirSync(outDir).filter((f) => /^sitemap-\d+\.xml$/.test(f) && f !== 'sitemap-0.xml');
if (extraChunks.length) throw new Error(`[build-sitemaps] unexpected extra sitemap chunks: ${extraChunks.join(', ')}`);

const urls = [...read(join(outDir, 'sitemap-0.xml').replace(root + '\\', '').replace(root + '/', '')).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
if (urls.length < 100) throw new Error(`[build-sitemaps] only ${urls.length} URLs parsed from sitemap-0.xml`);

// ---------- validate every URL ----------
const bad = urls.filter((u) => !u.startsWith(SITE + '/') || !u.endsWith('/') || u.includes('www.') || u.includes('/lp/') || u.includes('/thank-you'));
if (bad.length) throw new Error(`[build-sitemaps] ${bad.length} URLs fail the canonical rules (apex, trailing slash, no /lp/, no /thank-you):\n${bad.join('\n')}`);
if (new Set(urls).size !== urls.length) throw new Error('[build-sitemaps] duplicate URLs in sitemap-0.xml');

// ---------- lastmod sources ----------
const manifest = JSON.parse(read('src/data/lastmod.json')).files;
const fileDate = (rel) => manifest[rel] ?? null;
const maxDate = (...dates) => dates.filter(Boolean).sort().at(-1) ?? null;

const frontmatterDate = (dir, slug) => {
  const file = `src/content/${dir}/${slug}.mdx`;
  if (!existsSync(join(root, file))) return null;
  const fm = read(file).split('---')[1] ?? '';
  const pick = (key) => fm.match(new RegExp(`^${key}:\\s*['"]?(\\d{4}-\\d{2}-\\d{2})`, 'm'))?.[1] ?? null;
  return pick('updatedDate') ?? pick('publishDate');
};
const collectionDates = (dir) =>
  readdirSync(join(root, 'src/content', dir))
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => frontmatterDate(dir, f.replace(/\.mdx$/, '')));
const programDates = () =>
  readdirSync(join(root, 'src/pages/programs'))
    .filter((f) => f.endsWith('.astro') && f !== 'index.astro')
    .map((f) => fileDate(`src/pages/programs/${f}`));

const families = { core: [], states: [], cities: [], learn: [] };
const missing = [];

for (const url of urls) {
  const path = url.slice(SITE.length); // "/states/texas/"
  const seg = path.split('/').filter(Boolean); // ["states","texas"]
  let family = 'core';
  let lastmod = null;

  if (seg[0] === 'states' && seg.length === 2) {
    family = 'states';
    lastmod = fileDate('src/data/states.json');
  } else if (seg[0] === 'states' && seg.length === 3) {
    family = 'cities';
    lastmod = fileDate(`src/data/cities/${seg[1]}.json`);
  } else if (seg[0] === 'learn' && seg.length === 2) {
    family = 'learn';
    lastmod = frontmatterDate('learn', seg[1]);
  } else if (seg[0] === 'dscr-loans' && seg.length === 2) {
    family = 'learn';
    lastmod = frontmatterDate('scenarios', seg[1]);
  } else if (seg.length === 0) {
    lastmod = fileDate('src/pages/index.astro');
  } else if (path === '/states/') {
    lastmod = maxDate(fileDate('src/pages/states/index.astro'), fileDate('src/data/states.json'));
  } else if (path === '/learn/') {
    lastmod = maxDate(fileDate('src/pages/learn/index.astro'), ...collectionDates('learn'));
  } else if (path === '/dscr-loans/') {
    lastmod = maxDate(fileDate('src/pages/dscr-loans/index.astro'), ...collectionDates('scenarios'));
  } else if (path === '/programs/') {
    lastmod = maxDate(fileDate('src/pages/programs/index.astro'), ...programDates());
  } else if (seg[0] === 'programs' && seg.length === 2) {
    lastmod = fileDate(`src/pages/programs/${seg[1]}.astro`);
  } else if (seg.length === 1) {
    lastmod = fileDate(`src/pages/${seg[0]}.astro`);
  }

  if (!lastmod) missing.push(url);
  families[family].push({ url, lastmod });
}

for (const [name, list] of Object.entries(families)) {
  if (!list.length) throw new Error(`[build-sitemaps] family "${name}" is empty; the URL set changed shape`);
}
if (missing.length) console.warn(`[build-sitemaps] WARNING: ${missing.length} URLs have no known lastmod (omitted, never faked):\n  ${missing.join('\n  ')}`);

// ---------- write ----------
const xmlHead = '<?xml version="1.0" encoding="UTF-8"?>\n';
const urlset = (list) =>
  xmlHead +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  list.map(({ url, lastmod }) => `  <url><loc>${url}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`).join('\n') +
  '\n</urlset>\n';

const index = [];
for (const [name, list] of Object.entries(families)) {
  const file = `sitemap-${name}.xml`;
  writeFileSync(join(outDir, file), urlset(list));
  index.push({ loc: `${SITE}/${file}`, lastmod: maxDate(...list.map((u) => u.lastmod)) });
}
writeFileSync(
  join(outDir, 'sitemap-index.xml'),
  xmlHead +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    index.map(({ loc, lastmod }) => `  <sitemap><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</sitemap>`).join('\n') +
    '\n</sitemapindex>\n',
);
unlinkSync(join(outDir, 'sitemap-0.xml'));

const counts = Object.entries(families).map(([n, l]) => `${n} ${l.length}`).join(', ');
console.log(`[build-sitemaps] ${urls.length} URLs -> sitemap-index.xml (${counts}); ${urls.length - missing.length} with lastmod; sitemap-0.xml removed.`);
