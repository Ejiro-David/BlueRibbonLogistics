// Tiny static server for previewing dist/ (gzip + cache headers like a real host).
//   npm run preview          → http://localhost:4173
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
};

export function serve(dir, port = 4173) {
  const root = normalize(dir);
  const server = createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(root, p));
    if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404, { 'content-type': 'text/plain' }); res.end('Not found'); return;
    }
    const ext = extname(file);
    let body = readFileSync(file);
    const headers = { 'content-type': TYPES[ext] || 'application/octet-stream' };
    headers['cache-control'] = p.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache';
    if (/html|css|javascript|json|svg|xml|plain/.test(headers['content-type']) && /gzip/.test(req.headers['accept-encoding'] || '')) {
      body = gzipSync(body); headers['content-encoding'] = 'gzip';
    }
    res.writeHead(200, headers); res.end(body);
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', process.argv[2] || 'dist');
  const port = +(process.argv[3] || 4173);
  await serve(dir, port);
  console.log(`Serving ${dir} at http://localhost:${port}`);
}
