import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const CONF = path.join(ROOT, 'nginx', 'security-headers.conf');
const PORT = 4211;

if (!fs.existsSync(DIST)) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

// Parse add_header directives from nginx/security-headers.conf (single source of truth).
const raw = fs.readFileSync(CONF, 'utf8');
const headers = {};
for (const line of raw.split('\n')) {
  const m = line.match(/^\s*add_header\s+(\S+)\s+"((?:[^"\\]|\\.)*)"\s*(always)?\s*;/);
  if (m) headers[m[1]] = m[2].replace(/\\"/g, '"');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(DIST, urlPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html');
  }
  const ext = path.extname(filePath).toLowerCase();
  try {
    const data = fs.readFileSync(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
    if (urlPath.startsWith('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (urlPath === '/' || urlPath === '/index.html') {
      res.setHeader('Cache-Control', 'no-cache');
    }
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end('not found');
  }
});

await new Promise((resolve) => server.listen(PORT, resolve));
console.log(`Serving ${DIST} on http://127.0.0.1:${PORT}`);

// Discover test module ids from src/tests.
const testsDir = path.join(ROOT, 'src', 'tests');
const ids = fs.readdirSync(testsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const routes = ['/', ...ids.map((id) => `/test/${id}`)];
console.log('Routes to check:', routes.join(', '));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const messages = [];
page.on('console', (msg) => messages.push({ type: msg.type(), text: msg.text() }));
page.on('pageerror', (err) => messages.push({ type: 'pageerror', text: err.message }));

let failed = false;
for (const r of routes) {
  console.log(`=== Navigating ${r} ===`);
  try {
    await page.goto(`http://127.0.0.1:${PORT}${r}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
  } catch (e) {
    console.error(`Navigation failed for ${r}: ${e.message}`);
    failed = true;
  }
}

console.log('\n===== CONSOLE MESSAGES =====');
for (const m of messages) console.log(`[${m.type}] ${m.text}`);
console.log('===== END =====');
console.log('Total messages:', messages.length);

const cspViolations = messages.filter((m) => /content security policy|CSP|violates|Refused to/i.test(m.text));
const unrecognized = messages.filter((m) => /Unrecognized feature/i.test(m.text));
const pageErrors = messages.filter((m) => m.type === 'pageerror');
console.log('CSP-ish messages:', cspViolations.length);
console.log('Unrecognized feature messages:', unrecognized.length);
console.log('Page errors:', pageErrors.length);

if (cspViolations.length || unrecognized.length || pageErrors.length || failed) {
  failed = true;
}

await browser.close();
server.close();
process.exit(failed ? 1 : 0);
