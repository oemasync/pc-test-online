import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SVG = path.join(ROOT, 'public', 'favicon.svg')
const SIZES = [192, 512]

for (const size of SIZES) {
  const out = path.join(ROOT, 'public', `icon-${size}.png`)
  execFileSync('magick', [SVG, '-resize', `${size}x${size}`, '-background', 'none', out], {
    stdio: 'inherit',
  })
  if (!existsSync(out)) {
    throw new Error(`Failed to generate ${out}`)
  }
  console.log(`generated ${out}`)
}
