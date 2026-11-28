import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'
import path from 'node:path'

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
        .filter((f) => f !== '/sw.js' && !f.endsWith('.map'))
      const swPath = path.join(dist, 'sw.js')
      const sw = fs.readFileSync(swPath, 'utf8')
      fs.writeFileSync(swPath, sw.replace('"__PRECACHE_MANIFEST__"', JSON.stringify(files)))
      console.log(`precache manifest: ${files.length} files`)
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