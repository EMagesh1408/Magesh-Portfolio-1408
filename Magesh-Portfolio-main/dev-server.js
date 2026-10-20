/**
 * Local development server (no dependencies).
 *   1. copy .env.example to .env and add your OpenRouter key
 *   2. node dev-server.js      → http://localhost:3000
 * On Vercel this file is not used; static files + /api/chat are served natively.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

// minimal .env loader
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch (_) { /* no .env file — fine */ }

const chat = require('./api/chat.js');
const PORT = process.env.PORT || 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp'
};
// files that must never be served statically
const PRIVATE = /^\/(api\/|dev-server\.js|package(-lock)?\.json|vercel\.json|README|\.|node_modules\/)/i;

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/chat') {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 50000) req.destroy(); });
    req.on('end', () => {
      try { req.body = raw ? JSON.parse(raw) : {}; } catch (_) { req.body = {}; }
      chat(req, res);
    });
    return;
  }

  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  if (PRIVATE.test(rel)) { res.statusCode = 404; return res.end('Not found'); }
  const file = path.join(__dirname, rel);
  if (!file.startsWith(__dirname + path.sep)) { res.statusCode = 403; return res.end('Forbidden'); }

  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('Content-Type', TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
    res.end(data);
  });
}).listen(PORT, () => console.log('Portfolio running at http://localhost:' + PORT));
