// Production static file server for the built Member Portal (apps/member/dist).
//
// Zero-dependency (Node built-ins only) so it runs anywhere without installing
// extra packages — mirroring how the API is deployed on Railway (a `start`
// script that binds the platform-provided PORT). Serves the Vite build with
// SPA history fallback, correct MIME types, and sane cache headers.
//
// Usage:  node serve.mjs        (from apps/member, via `pnpm start`)
// Honors: PORT (Railway injects this), HOST (defaults to 0.0.0.0).

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST_DIR = resolve(__dirname, 'dist');
const PORT = Number.parseInt(process.env.PORT ?? '4173', 10);
const HOST = process.env.HOST ?? '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

if (!existsSync(DIST_DIR)) {
  console.error(
    `[serve] Build output not found at ${DIST_DIR}. Run "pnpm --filter @superdreams/member build" first.`,
  );
  process.exit(1);
}

const INDEX_HTML = join(DIST_DIR, 'index.html');

/** Resolves a request path to a real file inside DIST_DIR, or null if it escapes. */
function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0] ?? '/');
  // Normalize and strip leading slashes so join stays inside DIST_DIR.
  const safe = normalize(decoded)
    .replace(/^(\.\.[/\\])+/, '')
    .replace(/^[/\\]+/, '');
  const candidate = join(DIST_DIR, safe);
  if (!candidate.startsWith(DIST_DIR)) return null; // path traversal guard
  return candidate;
}

function send(res, status, filePath, extraHeaders = {}) {
  const ext = extname(filePath).toLowerCase();
  const type = MIME_TYPES[ext] ?? 'application/octet-stream';
  res.writeHead(status, { 'Content-Type': type, ...SECURITY_HEADERS, ...extraHeaders });
  createReadStream(filePath).pipe(res);
}

const server = createServer((req, res) => {
  const urlPath = req.url ?? '/';

  // Lightweight health endpoint for platform probes.
  if (urlPath === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
    res.end('ok\n');
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD', ...SECURITY_HEADERS });
    res.end('Method Not Allowed');
    return;
  }

  const filePath = resolveFile(urlPath);

  // Serve an existing static file.
  if (filePath && existsSync(filePath) && statSync(filePath).isFile()) {
    const isHashedAsset = filePath.includes(`${join(DIST_DIR, 'assets')}`);
    const cache = isHashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache';
    send(res, 200, filePath, { 'Cache-Control': cache });
    return;
  }

  // A missing file with an extension (e.g. a hashed asset) is a genuine 404 —
  // never fall back to index.html for it, or browsers would receive HTML in
  // place of a script/stylesheet. Only extensionless "route" paths fall back.
  if (extname(urlPath.split('?')[0] ?? '') !== '') {
    res.writeHead(404, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
    res.end('Not Found');
    return;
  }

  // SPA history fallback — let the client router handle unknown route paths.
  send(res, 200, INDEX_HTML, { 'Cache-Control': 'no-cache' });
});

server.listen(PORT, HOST, () => {
  console.log(`[serve] Member Portal serving ${DIST_DIR} on http://${HOST}:${PORT}`);
});
