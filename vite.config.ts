import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

function precacheManifestPlugin() {
  let outDir = 'dist'
  return {
    name: 'precache-manifest',
    apply: 'build' as const,
    configResolved(config: { build: { outDir: string } }) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const dist = path.resolve(process.cwd(), outDir)
      function walk(dir: string): string[] {
        const res: string[] = []
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name)
          if (entry.isDirectory()) res.push(...walk(full))
          else res.push(full)
        }
        return res
      }
      const files = walk(dist)
        .map((f) => '/' + path.relative(dist, f).split(path.sep).join('/'))
        .filter((f) => {
          if (f === '/sw.js') return false
          if (f.endsWith('.map')) return false
          if (f.startsWith('/.vite/')) return false
          return true
        })
        .sort()
      const hash = crypto.createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 8)
      const swPath = path.join(dist, 'sw.js')
      let sw = fs.readFileSync(swPath, 'utf8')
      sw = sw.replace('"__PRECACHE_MANIFEST__"', JSON.stringify(files))
      sw = sw.replace(/__BUILD_VERSION__/g, hash)
      fs.writeFileSync(swPath, sw)
      console.log(`precache manifest: ${files.length} files, build ${hash}`)
    },
  }
}

export default defineConfig({
  plugins: [vue(), precacheManifestPlugin()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  test: {
    environment: 'happy-dom',
    globals: false,
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts', 'src/**/*.vue'],
      thresholds: {
        'src/core/**': { lines: 90, branches: 90, functions: 90, statements: 90 },
        'src/lib/**': { lines: 90, branches: 90, functions: 90, statements: 90 },
      },
    },
  },
  build: {
    outDir: 'dist',
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (
            id.includes('node_modules/vue/') ||
            id.includes('node_modules/vue-router/') ||
            id.includes('node_modules/vue-i18n/')
          ) {
            return 'vendor-vue'
          }
          return null
        },
      },
    },
  },
})