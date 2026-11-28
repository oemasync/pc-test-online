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
            >Summary
            </router-link>
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
  --overlay-bg: rgba(0, 0, 0, 0.85);
  --overlay-text: #ffffff;
}
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
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border);
}
.app__header-left, .app__header-right {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}
.app__body {
  display: flex;
  flex: 1;
}
.app__sidebar {
  width: 200px;
  padding: 0.5rem;
  border-right: 1px solid var(--border);
}
.app__sidebar--right {
  border-right: none;
  border-left: 1px solid var(--border);
}
.app__main {
  flex: 1;
  padding: 1rem;
}
.app__footer {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-top: 1px solid var(--border);
}
.app__footer button {
  flex: 1 1 0;
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
  gap: 0.5rem;
  text-decoration: none;
  color: inherit;
  background: transparent;
  border: none;
  padding: 0;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.app__timer {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  padding: 0.25rem 0;
}
.app__timer-value {
  font-variant-numeric: tabular-nums;
}

@media (max-width: 768px) {
  .app__sidebar {
    display: none;
  }
}

@media print {
  .app__header, .app__sidebar, .app__footer {
    display: none;
  }
  .app__main {
    padding: 0;
  }
}
</style>
