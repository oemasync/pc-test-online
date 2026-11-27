<template>
  <TestLayout
    :test-id="id"
    :title="t('tests.mouse.title')"
    :details="details"
    :can-pass="canPass"
  >
    <template #instructions>
      {{ t('tests.mouse.instructions') }}
    </template>
    <div
      ref="area"
      class="mouse-test"
      tabindex="0"
      @mousedown="onMouseDown"
      @mouseup="onMouseUp"
      @mousemove="onMouseMove"
      @click="onClick"
      @wheel.prevent="onWheel"
      @contextmenu.prevent="onContextMenu"
      @auxclick="onAuxClick"
      @pointermove="onPointerMove"
    >
      <MouseButtons
        :pressed="buttonState.pressed"
        :tested="buttonState.tested"
        :last-interval="clickState.lastIntervalMs"
      />
      <MouseWheel
        :direction="wheelDirection"
        :delta-mode="deltaMode"
        :tested="Array.from(wheelDirections)"
      />
      <MousePolling
        :median-hz="pollingEstimate.estimatedHz"
        :nearest-rate="pollingEstimate.nearestStandardHz"
        :samples="pollingEstimate.sampleCount"
      />
      <MouseDrag
        :dragging="dragState.dragging"
        :completed="dragState.completed"
        :distance="dragState.distance"
      />
      <MouseChatter
        :count="chatterState.chatterCount"
        :detected="chatterState.chatterCount > 0"
      />
    </div>
  </TestLayout>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import TestLayout from '@/ui/TestLayout.vue'
import MouseButtons from './MouseButtons.vue'
import MouseWheel from './MouseWheel.vue'
import MousePolling from './MousePolling.vue'
import MouseDrag from './MouseDrag.vue'
import MouseChatter from './MouseChatter.vue'
import {
  initialButtonState,
  buttonReducer,
  isButtonTested,
  testedButtonCount,
  allButtonsTested,
  initialClickTrackerState,
  clickTrackerReducer,
  classifyWheel,
  initialDragState,
  dragReducer,
  initialChatterState,
  chatterReducer,
  estimatePollingRate,
  type ButtonTestState,
  type ClickTrackerState,
  type DragState,
  type ChatterState,
} from './logic'

const id = 'mouse'
const { t } = useI18n()

const area = ref<HTMLElement | null>(null)

const buttonState = ref<ButtonTestState>(initialButtonState())
const clickState = ref<ClickTrackerState>(initialClickTrackerState())
const wheelDirection = ref<'up' | 'down' | 'left' | 'right' | null>(null)
const wheelDirections = ref<Set<string>>(new Set())
const deltaMode = ref(0)
const pollingTimestamps = ref<number[]>([])
const dragState = ref<DragState>(initialDragState())
const chatterState = ref<ChatterState>(initialChatterState())

const pollingEstimate = computed(() => estimatePollingRate(pollingTimestamps.value))

const details = computed(() => ({
  buttonsTested: testedButtonCount(buttonState.value),
  allButtonsTested: allButtonsTested(buttonState.value),
  doubleClickIntervalMs: clickState.value.lastIntervalMs ?? 0,
  wheelDirectionsTested: wheelDirections.value.size,
  wheelDeltaMode: deltaMode.value,
  pollingRateHz: pollingEstimate.value.estimatedHz ?? 0,
  nearestPollingRateHz: pollingEstimate.value.nearestStandardHz ?? 0,
  dragCompleted: dragState.value.completed,
  dragDistancePx: Math.round(dragState.value.distance),
  chatterDetected: chatterState.value.chatterCount > 0,
  chatterCount: chatterState.value.chatterCount,
}))

const canPass = computed(() => {
  const bs = buttonState.value
  const left = isButtonTested(bs, 0)
  const middle = isButtonTested(bs, 1)
  const right = isButtonTested(bs, 2)
  return (
    left &&
    middle &&
    right &&
    wheelDirections.value.size >= 1 &&
    dragState.value.completed &&
    chatterState.value.chatterCount === 0
  )
})

function isDragTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.closest('.mouse-drag__box') !== null
}

function onMouseDown(e: MouseEvent): void {
  if (e.button === 3 || e.button === 4) {
    e.preventDefault()
  }
  if (isDragTarget(e.target)) {
    dragState.value = dragReducer(dragState.value, {
      type: 'start',
      x: e.clientX,
      y: e.clientY,
    })
    return
  }
  buttonState.value = buttonReducer(buttonState.value, {
    type: 'mousedown',
    button: e.button,
  })
  chatterState.value = chatterReducer(chatterState.value, {
    type: 'mousedown',
    button: e.button,
    timestamp: e.timeStamp,
  })
}

function onMouseUp(e: MouseEvent): void {
  if (dragState.value.dragging) {
    dragState.value = dragReducer(dragState.value, {
      type: 'end',
      x: e.clientX,
      y: e.clientY,
    })
    return
  }
  buttonState.value = buttonReducer(buttonState.value, {
    type: 'mouseup',
    button: e.button,
  })
}

function onMouseMove(e: MouseEvent): void {
  if (dragState.value.dragging) {
    dragState.value = dragReducer(dragState.value, {
      type: 'move',
      x: e.clientX,
      y: e.clientY,
    })
  }
}

function onClick(e: MouseEvent): void {
  clickState.value = clickTrackerReducer(clickState.value, {
    type: 'click',
    timestamp: e.timeStamp,
  })
}

function onWheel(e: WheelEvent): void {
  const direction = classifyWheel(e.deltaX, e.deltaY)
  if (direction) {
    wheelDirection.value = direction
    wheelDirections.value = new Set([...wheelDirections.value, direction])
  }
  deltaMode.value = e.deltaMode
}

function onContextMenu(e: MouseEvent): void {
  e.preventDefault()
}

function onAuxClick(e: MouseEvent): void {
  if (e.button === 3 || e.button === 4) {
    e.preventDefault()
  }
}

function onPointerMove(e: PointerEvent): void {
  const coalesced = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e]
  const stamps = coalesced.map((ev) => ev.timeStamp)
  pollingTimestamps.value = [...pollingTimestamps.value, ...stamps].slice(-200)
}

onUnmounted(() => {
  // template-bound listeners are removed by Vue; reset state
  area.value = null
})
</script>

<style scoped>
.mouse-test {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  outline: none;
}
</style>
