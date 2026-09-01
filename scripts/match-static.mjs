// Tiny static server for Lighthouse runs against the PRODUCTION build output
// (.vercel/output/static). astro preview does not support the Vercel adapter, and
// the dev server is unbundled, so this is the honest way to measure the page.
//   npm run build && node scripts/match-static.mjs   (port 4323)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '.vercel', 'output', 'static');
const PORT = Number(process.env.STATIC_PORT || 4323);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
};

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    let file = normalize(join(root, p));
    if (!file.startsWith(root)) throw new Error('bad path');
    let s = await stat(file).catch(() => null);
    if (s && s.isDirectory()) {
      file = join(file, 'index.html');
      s = await stat(file).catch(() => null);
    }
    if (!s) {
      res.writeHead(404);
      return res.end('not found');
    }
    let body = await readFile(file);
    const ext = extname(file).toLowerCase();
    const headers = { 'Content-Type': types[ext] || 'application/octet-stream' };
    if (p.startsWith('/_astro/') || p.startsWith('/fonts/')) headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    // gzip text assets like Vercel does, so Lighthouse's simulated network is not
    // charged for uncompressed transfer sizes prod never ships.
    const compressible = ['.html', '.css', '.js', '.mjs', '.json', '.svg', '.xml', '.txt'].includes(ext);
    if (compressible && /gzip/.test(req.headers['accept-encoding'] || '')) {
      body = gzipSync(body, { level: 9 });
      headers['Content-Encoding'] = 'gzip';
    }
    headers['Content-Length'] = body.length;
    res.writeHead(200, headers);
    res.end(body);
  } catch {
    res.writeHead(500);
    res.end('error');
  }
}).listen(PORT, '127.0.0.1', () => console.log(`static: http://127.0.0.1:${PORT}/match/  (root ${root})`));
