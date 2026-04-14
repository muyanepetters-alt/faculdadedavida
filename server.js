/**
 * FDV — Servidor local de desenvolvimento
 * Uso: node server.js
 * Hot reload via Server-Sent Events (sem dependências externas)
 */

'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

// ─── SSE clients ──────────────────────────────────────────────────────
const clients = new Set();

function broadcast() {
  for (const res of clients) {
    try { res.write('data: reload\n\n'); } catch (_) { clients.delete(res); }
  }
}

// ─── File watcher ─────────────────────────────────────────────────────
let debounceTimer = null;
fs.watch(ROOT, { recursive: true }, (event, filename) => {
  if (!filename) return;
  // ignore node_modules or hidden files
  if (filename.startsWith('.') || filename.includes('node_modules')) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    console.log(`  ↻  ${filename}`);
    broadcast();
  }, 80);
});

// ─── Hot-reload snippet injected into HTML ────────────────────────────
const HOT_SCRIPT = `
<script>
(function(){
  const es = new EventSource('/__hot');
  es.onmessage = () => location.reload();
  es.onerror   = () => setTimeout(() => location.reload(), 1000);
})();
</script>
`;

// ─── Server ───────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {

  // SSE endpoint
  if (req.url === '/__hot') {
    res.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(': connected\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  const urlPath  = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = path.join(ROOT, urlPath);
  const ext      = path.extname(filePath).toLowerCase();
  const mime     = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 — Not found');
      return;
    }

    // Inject hot-reload script before </body> in HTML files
    if (ext === '.html') {
      const html = data.toString().replace('</body>', HOT_SCRIPT + '</body>');
      res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });
      res.end(html);
      return;
    }

    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  FDV — Servidor local  ⚡ hot reload ativo');
  console.log('  ─────────────────────────────────────────');
  console.log(`  http://localhost:${PORT}`);
  console.log('  ─────────────────────────────────────────');
  console.log('  Ctrl+C para encerrar');
  console.log('');
});
