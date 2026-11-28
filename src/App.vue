<template>
  <div
    class="app"
    :data-theme="theme"
  >
    <a
      class="skip-link"
      href="#main-content"
    >
      {{ t('a11y.skipToContent') }}
    </a>
    <header class="app__header">
      <div class="app__header-left">
        <a
          class="app__link"
          href="https://github.com/oemasync/pc-test-online"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t('header.source') }}
        </a>
        <a
          class="app__link"
          href="https://buymeacoffee.com/omiinaya"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t('header.coffee') }}
        </a>
      </div>
      <div class="app__header-right">
        <select
          v-model="locale"
          class="app__lang"
          aria-label="language"
        >
          <option
            v-for="l in locales"
            :key="l"
            :value="l"
          >
            {{ l }}
          </option>
        </select>
        <button
          type="button"
          class="app__theme"
          @click="toggleTheme"
        >
          {{ t('theme.toggle') }}
        </button>
      </div>
    </header>

    <div class="app__body">
      <aside class="app__sidebar app__sidebar--left">
        <ul>
          <li
            v-for="m in modules"
            :key="m.id"
          >
            <template v-if="supported(m)">
              <router-link
                :to="`/test/${m.id}`"
                class="app__test-link"
              >
                <StatusLight
                  :status="status(m.id)"
                  :data-testid="`status-light-${m.id}`"
                  :data-status="status(m.id)"
                />
                <span>{{ t(m.titleKey) }}</span>
              </router-link>
            </template>
            <template v-else>
              <button
                type="button"
                class="app__test-link"
                @click="skip(m.id)"
              >
                <StatusLight
                  :status="status(m.id)"
                  :data-testid="`status-light-${m.id}`"
                  :data-status="status(m.id)"
                />
                <span>{{ t(m.titleKey) }}</span>
                <span class="app__unsupported">{{ t('buttons.unsupported') }}</span>
              </button>
            </template>
          </li>
          <li>
            <router-link
              to="/summary"
              class="app__test-link"
            >{{ t('nav.summary') }}</router-link>
          </li>
        </ul>
      </aside>

      <main
        id="main-content"
        ref="mainRef"
        tabindex="-1"
        class="app__main"
      >
        <router-view />
      </main>

      <aside class="app__sidebar app__sidebar--right">
        <div
          v-for="m in modules"
          :key="m.id"
          class="app__timer"
        >
          <span>{{ t(m.titleKey) }}</span>
          <span class="app__timer-value">{{ formatElapsed(m.id) }}</span>
        </div>
      </aside>
    </div>

    <footer class="app__footer">
      <button
        type="button"
        data-testid="reset-button"
        @click="reset"
      >
        {{ t('buttons.reset') }}
      </button>
      <button
        type="button"
        data-testid="export-button"
        @click="exportReport"
      >
        {{ t('buttons.export') }}
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale } from '@/i18n'
import { getTestModules } from '@/core/registry'
import type { TestModule } from '@/core/types'
import { elapsed, getStatus, reset as resetStore, skip } from '@/core/results'
import { exportJson } from '@/core/report'
import StatusLight from '@/ui/StatusLight.vue'
import { useRoute } from 'vue-router'

const { t, locale } = useI18n()
const locales = ['en', 'es']
const modules = getTestModules()
const route = useRoute()
const mainRef = ref<HTMLElement | null>(null)

function focusPageHeading(): void {
  const main = mainRef.value
  const heading = (main?.querySelector('h1, h2, h3') ?? null) as HTMLElement | null
  const target = heading ?? main
  if (!target || !target.isConnected) {
    return
  }
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
  target.tabIndex = -1
  target.focus()
}

watch(
  () => route.fullPath,
  () => {
    void nextTick().then(() => {
      const attempt = (remaining: number): void => {
        if (remaining <= 0) return
        const main = mainRef.value
        const heading = (main?.querySelector('h1, h2, h3') ?? null) as HTMLElement | null
        if (!main || !heading) {
          window.setTimeout(() => attempt(remaining - 1), 16)
          return
        }
        focusPageHeading()
      }
      attempt(10)
    })
  },
)
watch(locale, (value) => setLocale(value as 'en' | 'es'))
const theme = ref<'light' | 'dark'>('light')
const tick = ref(0)

let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  setLocale(locale.value as 'en' | 'es')
  const stored = localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark') {
    theme.value = stored
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    theme.value = 'dark'
  }
  applyTheme()
  timer = setInterval(() => {
    tick.value++
  }, 100)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function applyTheme(): void {
  document.documentElement.setAttribute('data-theme', theme.value)
}

function toggleTheme(): void {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem('theme', theme.value)
  applyTheme()
}

function status(id: string) {
  return getStatus(id)
}

function supported(m: TestModule): boolean {
  return m.isSupported?.() ?? true
}

function formatElapsed(id: string): string {
  void tick.value
  return (elapsed(id) / 1000).toFixed(2) + 's'
}

function reset(): void {
  resetStore()
}

function exportReport(): void {
  exportJson()
}
</script>

<style>
:root {
  --bg: #ffffff;
  --text: #111827;
  --text-secondary: #6b7280;
  --border: #e5e7eb;
  --surface: #f9fafb;
  --color-danger: #dc2626;
  --color-warning: #f59e0b;
  --color-warning-bg: #fef3c7;
  --color-success: #22c55e;
  --color-accent: #2563eb;
  --color-text-muted: #6b7280;

  --color-on-success: #052e16;
  --color-on-warning: #422006;

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;

  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;

  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --leading-tight: 1.25;
  --leading-normal: 1.5;

  --dur-fast: 120ms;
  --dur-base: 200ms;
  --ease: cubic-bezier(0.4, 0, 0.2, 1);

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);

  --overlay-bg: rgba(17, 24, 39, 0.85);
  --overlay-text: #ffffff;
}
[data-theme='dark'] {
  --bg: #111827;
  --text: #f9fafb;
  --text-secondary: #9ca3af;
  --border: #374151;
  --surface: #1f2937;
  --color-danger: #f87171;
  --color-warning: #fbbf24;
  --color-warning-bg: #422006;
  --color-success: #4ade80;
  --color-accent: #60a5fa;
  --color-text-muted: #9ca3af;
  --color-on-success: #052e16;
  --color-on-warning: #422006;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);

  --overlay-bg: rgba(0, 0, 0, 0.85);
  --overlay-text: #ffffff;
}
*,
*::before,
*::after {
  box-sizing: border-box;
}
html,
body {
  margin: 0;
  padding: 0;
}
body {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
}
.app__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--border);
  gap: var(--space-3);
  flex-wrap: wrap;
}
.app__header-left,
.app__header-right {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  flex-wrap: wrap;
}
.app__body {
  display: flex;
  flex: 1;
  min-width: 0;
}
.app__sidebar {
  width: 200px;
  padding: var(--space-2);
  border-right: 1px solid var(--border);
  overflow-y: auto;
}
.app__sidebar--right {
  border-right: none;
  border-left: 1px solid var(--border);
}
.app__main {
  flex: 1;
  padding: var(--space-4);
  min-width: 0;
}
.app__footer {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-top: 1px solid var(--border);
}
.app__footer button {
  flex: 1 1 0;
}
.app__sidebar ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.app__sidebar li {
  margin: 0;
}
.app__link,
.skip-link {
  color: var(--color-accent);
  text-decoration: none;
}
.app__link:hover,
.skip-link:hover {
  text-decoration: underline;
}
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 0.5rem 1rem;
  background: var(--bg);
  color: var(--color-accent);
  z-index: 100;
  transition: top 0.15s ease;
}
.skip-link:focus,
.skip-link:focus-visible {
  top: 0;
}
.app__test-link {
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  text-decoration: none;
  color: inherit;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  transition: background var(--dur-fast) var(--ease);
  flex-wrap: wrap;
}
.app__test-link:hover {
  background: var(--surface);
}
.app__sidebar button.app__test-link {
  border: none;
  background: transparent;
  text-align: left;
  width: 100%;
  cursor: pointer;
}
.app__sidebar button.app__test-link:hover {
  background: var(--surface);
}
.app__unsupported {
  flex-basis: 100%;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin-top: var(--space-1);
}
.app__timer {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-sm);
  padding: var(--space-1) 0;
  gap: var(--space-2);
}
.app__timer-value {
  font-variant-numeric: tabular-nums;
}
.app__link {
  color: var(--color-accent);
  text-decoration: none;
  font-size: var(--text-sm);
}
.app__link:hover {
  text-decoration: underline;
}
.app__lang,
.app__theme {
  font: inherit;
}
.app__theme {
  padding: var(--space-1) var(--space-3);
}

button {
  font: inherit;
  cursor: pointer;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  transition: background var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease),
    opacity var(--dur-fast) var(--ease);
}
button:hover:not(:disabled) {
  background: var(--bg);
  border-color: var(--color-accent);
}
button:active:not(:disabled) {
  transform: translateY(1px);
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
input,
select,
textarea {
  font: inherit;
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  color: var(--text);
  transition: border-color var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease);
}
input:focus,
select:focus,
textarea:focus {
  border-color: var(--color-accent);
  outline: none;
}

button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

img,
video,
svg {
  max-width: 100%;
  height: auto;
}
canvas {
  max-width: 100%;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

@media (max-width: 768px) {
  .app__sidebar {
    display: none;
  }
}

@media print {
  .app__header,
  .app__sidebar,
  .app__footer {
    display: none;
  }
  .app__main {
    padding: 0;
  }
}
</style>