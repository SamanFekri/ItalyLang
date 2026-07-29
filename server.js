#!/usr/bin/env node
/* ============================================================================
   server.js — static dev server for the Italiano Interattivo site
   ----------------------------------------------------------------------------
   Zero dependencies: uses only Node's built-in http/fs/path modules, so it
   runs with a plain `node server.js` — no `npm install` required.

     node server.js              → http://localhost:3000
     node server.js 8080         → custom port
     PORT=8080 node server.js    → custom port via env
     npm start                   → same as `node server.js`

   Features:
     • serves every file in this folder (index.html, assets/, A2/, …)
     • directory requests resolve to index.html
     • correct MIME types + UTF-8 charset (important for the Farsi content)
     • no-cache headers, so editing a lesson and refreshing shows it instantly
     • blocks path traversal (…/../../etc/passwd)
   ========================================================================== */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.argv[2] || process.env.PORT || 3000);

/* Content types we actually ship. charset=utf-8 keeps فارسی and accents intact. */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
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
  '.mp3': 'audio/mpeg',
  '.txt': 'text/plain; charset=utf-8'
};

/** Maps a request URL to a safe absolute path inside ROOT, or null if unsafe. */
function resolvePath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  } catch (e) {
    return null; // malformed percent-encoding
  }

  const target = path.normalize(path.join(ROOT, decoded));
  // Path traversal guard: the result must stay inside ROOT.
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) return null;

  // A directory (or "/") is served as its index.html.
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    return path.join(target, 'index.html');
  }
  return target;
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', 'Allow': 'GET, HEAD' });
    return res.end('405 — Method Not Allowed');
  }

  const file = resolvePath(req.url);
  const label = req.method + ' ' + req.url;

  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    console.log('  404  ' + label);
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(
      '<!doctype html><meta charset="utf-8">' +
      '<title>404 — non trovato</title>' +
      '<body style="font-family:system-ui;padding:40px;line-height:1.6">' +
      '<h1>404 — pagina non trovata</h1>' +
      '<p>Il file <code>' + req.url.replace(/[<>&]/g, '') + '</code> non esiste.</p>' +
      '<p><a href="/">↩ Torna alla home</a></p></body>'
    );
  }

  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const stat = fs.statSync(file);

  console.log('  200  ' + label);
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': stat.size,
    // Always revalidate: you want to see your lesson edits on refresh.
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });

  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('\n  ✗ La porta ' + PORT + ' è già occupata.');
    console.error('    Prova con un\'altra porta:  node server.js ' + (PORT + 1) + '\n');
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log('\n  🇮🇹  Italiano Interattivo — server avviato\n');
  console.log('      Locale:    http://localhost:' + PORT);
  console.log('      Livello A2: http://localhost:' + PORT + '/A2/');
  console.log('\n      Cartella:  ' + ROOT);
  console.log('      Ctrl+C per fermare il server.\n');
});
