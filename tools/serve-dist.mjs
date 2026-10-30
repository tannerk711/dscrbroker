// Static server for the BUILT output (FORM-LP-BRIEF.md section 5). `astro preview`
// is not supported by the Vercel adapter, so this stands in for Lighthouse and
// prod-like reads of the shipped HTML/CSS. Ported from
// clients/dscr-funnel-template-4/tools/serve-dist.mjs.
//
// Root: dist/client, fallback .vercel/output/static, fallback dist/.
// Clean URLs: `/` -> index.html, `/a/b` -> /a/b/index.html then /a/b.html, else 404.
// `/api/*` -> 404 (serverless is not part of the audit). Text types are gzipped like
// Vercel serves them: Lighthouse's simulated throttling is driven by transfer size
// and an uncompressed local server under-reports production by ~10 points.
//
//   node tools/serve-dist.mjs            (LH_PORT, default 4399)
//   import { startServer } from './serve-dist.mjs'   (lp-lh.mjs runs it in-process)
import { createServer } from 'node:http';
import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, extname, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const DEFAULT_PORT = Number(process.env.LH_PORT || 4399);

export const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.mjs', '.svg', '.json', '.txt', '.xml']);

export function resolveRoot() {
  const candidates = [join(ROOT, 'dist', 'client'), join(ROOT, '.vercel', 'output', 'static'), join(ROOT, 'dist')];
  for (const c of candidates) if (existsSync(join(c, 'index.html'))) return c;
  throw new Error(`no built output found (looked for index.html in ${candidates.join(', ')}); run npm run build first`);
}

function isFile(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

export function resolveFile(root, urlPath) {
  let clean;
  try {
    clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  } catch {
    return null;
  }
  if (clean === '' || clean === '/') return join(root, 'index.html');
  const trimmed = clean.replace(/\/+$/, '');
  const candidates = [join(root, trimmed), join(root, trimmed, 'index.html'), join(root, `${trimmed}.html`)];
  const rootAbs = resolve(root) + sep;
  for (const c of candidates) {
    const abs = resolve(c);
    if (!abs.startsWith(rootAbs)) continue; // path traversal guard
    if (isFile(abs)) return abs;
  }
  return null;
}

export function startServer(port = DEFAULT_PORT, opts = {}) {
  const root = opts.root || resolveRoot();
  const quiet = !!opts.quiet;
  const server = createServer(async (req, res) => {
    const url = req.url || '/';
    if (/^\/api\//.test(url)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('not found (serverless routes are not served here)');
      return;
    }
    const file = resolveFile(root, url);
    if (!file) {
      const nf = join(root, '404.html');
      const body = isFile(nf) ? await readFile(nf) : Buffer.from('not found');
      res.writeHead(404, { 'Content-Type': isFile(nf) ? MIME['.html'] : 'text/plain; charset=utf-8' });
      res.end(body);
      if (!quiet) console.log(`404 ${url}`);
      return;
    }
    const ext = extname(file).toLowerCase();
    let body = await readFile(file);
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
    headers['Cache-Control'] = /[\\/]_astro[\\/]/.test(file) ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate';
    if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''))) {
      body = gzipSync(body, { level: 6 });
      headers['Content-Encoding'] = 'gzip';
      headers['Vary'] = 'Accept-Encoding';
    }
    headers['Content-Length'] = body.length;
    res.writeHead(200, headers);
    res.end(body);
  });
  return new Promise((resolveP, reject) => {
    server.once('error', (e) => {
      if (e.code === 'EADDRINUSE') reject(new Error(`port ${port} is already in use (a stale server is squatting it); pick another LH_PORT or stop it`));
      else reject(e);
    });
    server.listen(port, '127.0.0.1', () => {
      if (!quiet) console.log(`serve-dist: http://localhost:${port}  root ${root}`);
      resolveP({
        server,
        port,
        root,
        url: `http://localhost:${port}`,
        close: () => new Promise((r) => server.close(() => r(null))),
      });
    });
  });
}

const isCli = process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (isCli) {
  try {
    await startServer(DEFAULT_PORT);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
