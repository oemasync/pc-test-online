<template>
  <TestLayout
    test-id="benchmark"
    :title="t('tests.benchmark.title')"
    :details="details"
    :can-pass="canPass"
  >
    <template #instructions>
      {{ t('tests.benchmark.instructions') }}
    </template>

    <div class="benchmark">
      <div class="benchmark__controls">
        <label>
          <span>{{ t('tests.benchmark.modeLabel') }}</span>
          <select
            v-model="mode"
            :disabled="running"
          >
            <option value="quick">{{ t('tests.benchmark.quick') }}</option>
            <option value="full">{{ t('tests.benchmark.full') }}</option>
          </select>
        </label>
        <button
          type="button"
          data-testid="run-button"
          :disabled="running"
          @click="run"
        >
          {{ t('tests.benchmark.run') }}
        </button>
        <button
          type="button"
          data-testid="abort-button"
          :disabled="!running"
          @click="abort"
        >
          {{ t('tests.benchmark.abort') }}
        </button>
      </div>

      <div class="benchmark__progress">
        <progress
          :value="progress"
          max="1"
        />
        <span>{{ Math.round(progress * 100) }}%</span>
      </div>

      <p
        v-if="error"
        class="benchmark__error"
      >
        {{ error }}
      </p>
      <p
        v-if="result && !result.allChecksumsVerified"
        class="benchmark__error"
      >
        {{ t('tests.benchmark.checksumError') }}
      </p>

      <table
        v-if="result"
        class="benchmark__results"
        aria-live="polite"
        aria-atomic="true"
      >
        <tbody>
          <tr>
            <th>{{ t('tests.benchmark.singleScore') }}</th>
            <td>{{ result.singleThreadScore.toFixed(2) }}</td>
          </tr>
          <tr>
            <th>{{ t('tests.benchmark.multiThroughput') }}</th>
            <td>{{ result.multiThreadThroughput.toFixed(2) }}</td>
          </tr>
          <tr>
            <th>{{ t('tests.benchmark.scalingEfficiency') }}</th>
            <td>{{ result.scalingEfficiency.toFixed(3) }}</td>
          </tr>
          <tr>
            <th>{{ t('tests.benchmark.memoryBandwidth') }}</th>
            <td>{{ result.memoryBandwidthMiBps.toFixed(2) }} MiB/s</td>
          </tr>
          <tr>
            <th>{{ t('tests.benchmark.gpuFillRate') }}</th>
            <td>
              {{
                result.gpuFillRateMPixelsPerSec === null
                  ? 'n/a'
                  : result.gpuFillRateMPixelsPerSec.toFixed(2)
              }}
            </td>
          </tr>
          <tr>
            <th>{{ t('tests.benchmark.checksums') }}</th>
            <td>
              {{
                result.allChecksumsVerified
                  ? t('tests.benchmark.verified')
                  : t('tests.benchmark.mismatch')
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </TestLayout>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import TestLayout from '@/ui/TestLayout.vue';
import type { BenchmarkResultData } from './worker';

const { t } = useI18n();

type Mode = 'quick' | 'full';
const mode = ref<Mode>('quick');
const running = ref(false);
const progress = ref(0);
const error = ref<string | null>(null);
const result = ref<BenchmarkResultData | null>(null);

let worker: Worker | null = null;

function terminateWorker(): void {
    worker?.terminate();
    worker = null;
}

function run(): void {
    terminateWorker();
    error.value = null;
    result.value = null;
    progress.value = 0;
    running.value = true;
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (ev: MessageEvent) => {
        const msg = ev.data as { type: string; progress?: number; data?: BenchmarkResultData };
        if (msg.type === 'progress' && typeof msg.progress === 'number') {
            progress.value = msg.progress;
        } else if (msg.type === 'result' && msg.data) {
            result.value = msg.data;
        } else if (msg.type === 'done') {
            running.value = false;
            terminateWorker();
        } else if (msg.type === 'error') {
            error.value = String((ev.data as { message?: string }).message ?? 'error');
            running.value = false;
            terminateWorker();
        }
    };
    worker.onerror = (ev: ErrorEvent) => {
        error.value = ev.message;
        running.value = false;
        terminateWorker();
    };
    const runs = mode.value === 'quick' ? 2 : 3;
    const targetMs = mode.value === 'quick' ? 50 : 200;
    worker.postMessage({ type: 'run', config: { mode: mode.value, runs, targetMs } });
}

function abort(): void {
    worker?.postMessage({ type: 'abort' });
    terminateWorker();
    running.value = false;
}

const details = computed<Record<string, string | number | boolean>>(() => {
    if (!result.value) return {} as Record<string, string | number | boolean>
    const r = result.value
    return {
        cpuSingleThreadScore: r.singleThreadScore,
        cpuMultiThreadThroughput: r.multiThreadThroughput,
        scalingEfficiency: r.scalingEfficiency,
        memoryCopyBandwidthMiBps: r.memoryBandwidthMiBps,
        gpuFillRateMPixelsPerSec: r.gpuFillRateMPixelsPerSec ?? 0,
        intHashChecksum: r.singleChecksums.intHash,
        primeSieveChecksum: r.singleChecksums.primeSieve,
        matrixChecksum: r.singleChecksums.matrix,
        memoryChecksum: r.memoryChecksum,
        allChecksumsVerified: r.allChecksumsVerified,
        workers: r.workers,
        runs: r.runs,
    } as Record<string, string | number | boolean>
})

const canPass = computed(
    () => !running.value && result.value !== null && result.value.allChecksumsVerified
);

onUnmounted(() => {
    terminateWorker();
});
</script>

<style scoped>
.benchmark {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.benchmark__controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
}
.benchmark__progress {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}
.benchmark__error {
    color: var(--color-danger);
}
.benchmark__results {
    width: 100%;
    border-collapse: collapse;
}
.benchmark__results th,
.benchmark__results td {
    border: 1px solid var(--border);
    padding: 0.25rem 0.5rem;
}
</style>
