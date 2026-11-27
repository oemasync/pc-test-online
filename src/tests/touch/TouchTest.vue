<template>
  <TestLayout
    :test-id="id"
    :title="t('tests.touch.title')"
    :details="details"
    :can-pass="canPass"
  >
    <template #instructions>
      {{ t('tests.touch.instructions') }}
    </template>

    <div
      v-if="!supported"
      class="touch-test__unsupported"
    >
      {{ t('tests.touch.unsupported') }}
    </div>

    <div
      v-else
      class="touch-test"
      :class="{ 'touch-test--fullscreen': fullscreen }"
    >
      <div class="touch-test__toolbar">
        <button
          type="button"
          class="touch-test__fullscreen-btn"
          @click="toggleFullscreen"
        >
          {{ fullscreen ? t('tests.touch.exitFullscreen') : t('tests.touch.fullscreen') }}
        </button>
      </div>

      <div
        ref="surface"
        class="touch-test__surface"
        :style="{ touchAction: 'none' }"
      >
        <div
          v-for="cell in cells"
          :key="cell.index"
          class="touch-test__cell"
          :class="{ 'touch-test__cell--hit': cell.hit }"
        />
        <div
          v-for="p in activeList"
          :key="p.pointerId"
          class="touch-test__point"
          :style="{ left: p.x * 100 + '%', top: p.y * 100 + '%' }"
        />
      </div>

      <div class="touch-test__stats">
        <StatTile
          :label="t('tests.touch.maxSimultaneousLabel')"
          :value="active.maxSimultaneous"
        />
        <StatTile
          :label="t('tests.touch.coverageLabel')"
          :value="coveragePercent + '%'"
        />
        <StatTile
          :label="t('tests.touch.deadCellsLabel')"
          :value="deadCells"
        />
      </div>

      <div class="touch-test__readouts">
        <span>{{ t('tests.touch.penDetected') }}: {{ penDetected ? 'yes' : 'no' }}</span>
        <span>{{ t('tests.touch.pressureReported') }}:
          {{ pressureReported ? 'yes' : 'no' }}</span>
        <span>{{ t('tests.touch.tiltReported') }}: {{ tiltReported ? 'yes' : 'no' }}</span>
      </div>
    </div>
  </TestLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import TestLayout from '@/ui/TestLayout.vue';
import StatTile from '@/ui/StatTile.vue';
import {
    createCoverageState,
    createPointerTracker,
    pointerTrackerReducer,
    coverageReducer,
    coveredCount,
    coverageRatio,
    type PointerSample,
    type PointerType,
} from './logic';

const id = 'touch';
const { t } = useI18n();

const ROWS = 12;
const COLS = 20;

const supported = navigator.maxTouchPoints > 0;
const surface = ref<HTMLElement | null>(null);
const fullscreen = ref(false);
const rafId = ref<number | null>(null);

const coverageState = ref(createCoverageState(ROWS, COLS));
const active = ref(createPointerTracker());

const penDetected = ref(false);
const pressureReported = ref(false);
const tiltReported = ref(false);

const activeList = computed(() => Array.from(active.value.active.values()));

const cells = computed(() => coverageState.value.grid.hit.map((hit, index) => ({ index, hit })));

const deadCells = computed(() => ROWS * COLS - coveredCount(coverageState.value));
const coveragePercent = computed(() => Math.round(coverageRatio(coverageState.value) * 100));

const details = computed(() => ({
    maxTouchPoints: navigator.maxTouchPoints,
    maxSimultaneous: active.value.maxSimultaneous,
    coveredCells: coveredCount(coverageState.value),
    totalCells: ROWS * COLS,
    coverageRatio: coverageRatio(coverageState.value),
    hasDeadZones: deadCells.value > 0,
    penDetected: penDetected.value,
    pressureReported: pressureReported.value,
    tiltReported: tiltReported.value,
}));

const canPass = computed(
    () => coverageRatio(coverageState.value) >= 0.9 && active.value.maxSimultaneous >= 1
);

function toNormalized(e: PointerEvent, rect: DOMRect): { x: number; y: number; pointerId: number } {
    return {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
        pointerId: e.pointerId,
    };
}

function recordReadout(sample: PointerSample): void {
    if (sample.pointerType === 'pen') penDetected.value = true;
    if (sample.pressure !== undefined && sample.pressure > 0) pressureReported.value = true;
    if (sample.tiltX !== undefined && (sample.tiltX !== 0 || (sample.tiltY ?? 0) !== 0))
        tiltReported.value = true;
}

function onPointerDown(e: PointerEvent): void {
    if (!supported || !surface.value) return;
    e.preventDefault();
    try {
        surface.value.setPointerCapture(e.pointerId);
    } catch {
        // ignore
    }
    const rect = surface.value.getBoundingClientRect();
    const sample: PointerSample = {
        pointerId: e.pointerId,
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
        pressure: e.pressure,
        tiltX: e.tiltX,
        tiltY: e.tiltY,
        width: e.width,
        height: e.height,
        pointerType: e.pointerType as PointerType,
        timestamp: e.timeStamp,
    };
    active.value = pointerTrackerReducer(active.value, { type: 'down', sample });
    recordReadout(sample);
    const coalesced = (
        typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e]
    ) as PointerEvent[];
    const samples = coalesced.map(ev => toNormalized(ev, rect));
    coverageState.value = coverageReducer(coverageState.value, { type: 'markPath', samples });
}

function onPointerMove(e: PointerEvent): void {
    if (!supported || !surface.value) return;
    const rect = surface.value.getBoundingClientRect();
    const sample: PointerSample = {
        pointerId: e.pointerId,
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
        pressure: e.pressure,
        tiltX: e.tiltX,
        tiltY: e.tiltY,
        width: e.width,
        height: e.height,
        pointerType: e.pointerType as PointerType,
        timestamp: e.timeStamp,
    };
    if (active.value.active.has(e.pointerId)) {
        active.value = pointerTrackerReducer(active.value, { type: 'move', sample });
    }
    recordReadout(sample);
    const coalesced = (
        typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e]
    ) as PointerEvent[];
    const samples = coalesced.map(ev => toNormalized(ev, rect));
    coverageState.value = coverageReducer(coverageState.value, { type: 'markPath', samples });
}

function onPointerUp(e: PointerEvent): void {
    if (!supported) return;
    active.value = pointerTrackerReducer(active.value, { type: 'up', pointerId: e.pointerId });
    coverageState.value = coverageReducer(coverageState.value, {
        type: 'end',
        pointerId: e.pointerId,
    });
}

function onPointerCancel(e: PointerEvent): void {
    if (!supported) return;
    active.value = pointerTrackerReducer(active.value, { type: 'cancel', pointerId: e.pointerId });
    coverageState.value = coverageReducer(coverageState.value, {
        type: 'end',
        pointerId: e.pointerId,
    });
}

function toggleFullscreen(): void {
    fullscreen.value = !fullscreen.value;
}

onMounted(() => {
    if (surface.value) {
        surface.value.addEventListener('pointerdown', onPointerDown);
        surface.value.addEventListener('pointermove', onPointerMove);
        surface.value.addEventListener('pointerup', onPointerUp);
        surface.value.addEventListener('pointercancel', onPointerCancel);
    }
    rafId.value = requestAnimationFrame(() => {
        rafId.value = null;
    });
});

onUnmounted(() => {
    if (rafId.value !== null) {
        cancelAnimationFrame(rafId.value);
        rafId.value = null;
    }
    if (surface.value) {
        surface.value.removeEventListener('pointerdown', onPointerDown);
        surface.value.removeEventListener('pointermove', onPointerMove);
        surface.value.removeEventListener('pointerup', onPointerUp);
        surface.value.removeEventListener('pointercancel', onPointerCancel);
    }
});
</script>

<style scoped>
.touch-test {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}
.touch-test--fullscreen {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: var(--bg, #0f172a);
    padding: 1rem;
}
.touch-test__toolbar {
    display: flex;
    justify-content: flex-end;
}
.touch-test__surface {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    background: var(--surface, #1e293b);
    border: 1px solid var(--border, #334155);
    border-radius: 8px;
    overflow: hidden;
    display: grid;
    grid-template-columns: repeat(20, 1fr);
    grid-template-rows: repeat(12, 1fr);
    touch-action: none;
}
.touch-test__cell {
    border: 1px solid rgba(255, 255, 255, 0.05);
}
.touch-test__cell--hit {
    background: rgba(34, 197, 94, 0.6);
}
.touch-test__point {
    position: absolute;
    width: 16px;
    height: 16px;
    margin-left: -8px;
    margin-top: -8px;
    border-radius: 50%;
    background: #f59e0b;
    pointer-events: none;
}
.touch-test__stats {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}
.touch-test__readouts {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    font-size: 0.875rem;
}
.touch-test__unsupported {
    padding: 1rem;
    color: var(--muted, #94a3b8);
}
</style>
