import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'dist')
const ASSETS = path.join(DIST, 'assets')

// Entry chunk gzip budget: ~10% above the measured post-split size.
const ENTRY_BUDGET_GZIP = 27000
const CHUNK_BUDGET_GZIP = 150 * 1024

function gzipSize(file) {
  const buf = fs.readFileSync(file)
  return zlib.gzipSync(buf).length
}

if (!fs.existsSync(ASSETS)) {
  console.error('dist/assets not found. Run npm run build first.')
  process.exit(1)
}

const manifestPath = path.join(DIST, '.vite', 'manifest.json')
if (!fs.existsSync(manifestPath)) {
  console.error('dist/.vite/manifest.json not found. Enable build.manifest.')
  process.exit(1)
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

const files = fs.readdirSync(ASSETS)
let failed = false

// Entry chunk check (identified via Vite manifest isEntry).
const entryFiles = Object.values(manifest)
  .filter((e) => e && e.isEntry)
  .map((e) => path.basename(e.file))
for (const f of entryFiles) {
  const size = gzipSize(path.join(ASSETS, f))
  console.log(`entry ${f}: ${size} bytes gzip (budget ${ENTRY_BUDGET_GZIP})`)
  if (size > ENTRY_BUDGET_GZIP) {
    console.error(`FAIL: entry chunk exceeds budget (${size} > ${ENTRY_BUDGET_GZIP})`)
    failed = true
  }
}

// Any chunk check
for (const f of files) {
  const full = path.join(ASSETS, f)
  if (!fs.statSync(full).isFile()) continue
  const size = gzipSize(full)
  if (size > CHUNK_BUDGET_GZIP) {
    console.error(`FAIL: chunk ${f} exceeds ${CHUNK_BUDGET_GZIP} bytes gzip (${size})`)
    failed = true
  }
}

if (failed) process.exit(1)
console.log('size-check: OK')