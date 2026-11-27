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
      aria-live="polite"
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
      <div aria-live="polite">
        <MousePolling
          :median-hz="pollingEstimate.estimatedHz"
          :nearest-rate="pollingEstimate.nearestStandardHz"
          :samples="pollingEstimate.sampleCount"
        />
      </div>
      <MouseDrag
        :dragging="dragState.dragging"
        :completed="dragState.completed"
        :distance="dragState.distance"
      />
      <div aria-live="polite">
        <MouseChatter
          :count="chatterState.chatterCount"
          :detected="chatterState.chatterCount > 0"
        />
      </div>
      <div class="mouse-test__options">
        <button
          type="button"
          data-testid="skip-back-forward"
          @click="backForwardSkipped = true"
        >
          {{ t('tests.mouse.skipBackForward') }}
        </button>
        <button
          v-if="chatterState.chatterCount > 0"
          type="button"
          data-testid="ack-chatter"
          @click="chatterAcknowledged = true"
        >
          {{ t('tests.mouse.acknowledgeChatter') }}
        </button>
      </div>
    </div>
  </TestLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
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
const backForwardSkipped = ref(false)
const chatterAcknowledged = ref(false)

let rafId: number | null = null

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
  backForwardSkipped: backForwardSkipped.value,
  chatterAcknowledged: chatterAcknowledged.value,
}))

const canPass = computed(() => {
  const bs = buttonState.value
  const left = isButtonTested(bs, 0)
  const middle = isButtonTested(bs, 1)
  const right = isButtonTested(bs, 2)
  const backForwardOk =
    (isButtonTested(bs, 3) && isButtonTested(bs, 4)) || backForwardSkipped.value
  const chatterOk = chatterState.value.chatterCount === 0 || chatterAcknowledged.value
  return (
    left &&
    middle &&
    right &&
    backForwardOk &&
    wheelDirections.value.size >= 1 &&
    dragState.value.completed &&
    chatterOk
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
  e.preventDefault()
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
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
  }
  rafId = requestAnimationFrame(() => {
    const coalesced =
      typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e]
    const stamps = coalesced.map((ev) => ev.timeStamp)
    pollingTimestamps.value = [...pollingTimestamps.value, ...stamps].slice(-200)
    rafId = null
  })
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault()
    buttonState.value = buttonReducer(buttonState.value, {
      type: 'mousedown',
      button: 0,
    })
    buttonState.value = buttonReducer(buttonState.value, {
      type: 'mouseup',
      button: 0,
    })
    wheelDirections.value = new Set([...wheelDirections.value, 'up'])
    wheelDirection.value = 'up'
  } else if (e.code === 'ArrowUp') {
    wheelDirection.value = 'up'
    wheelDirections.value = new Set([...wheelDirections.value, 'up'])
  } else if (e.code === 'ArrowDown') {
    wheelDirection.value = 'down'
    wheelDirections.value = new Set([...wheelDirections.value, 'down'])
  } else if (e.code === 'ArrowLeft') {
    wheelDirection.value = 'left'
    wheelDirections.value = new Set([...wheelDirections.value, 'left'])
  } else if (e.code === 'ArrowRight') {
    wheelDirection.value = 'right'
    wheelDirections.value = new Set([...wheelDirections.value, 'right'])
  }
}

const listeners: Array<[string, EventListener]> = [
  ['mousedown', onMouseDown as EventListener],
  ['mouseup', onMouseUp as EventListener],
  ['mousemove', onMouseMove as EventListener],
  ['click', onClick as EventListener],
  ['wheel', onWheel as EventListener],
  ['contextmenu', onContextMenu as EventListener],
  ['auxclick', onAuxClick as EventListener],
  ['pointermove', onPointerMove as EventListener],
  ['keydown', onKeyDown as EventListener],
]

onMounted(() => {
  const el = area.value
  if (!el) return
  for (const [type, handler] of listeners) {
    el.addEventListener(type, handler)
  }
})

onUnmounted(() => {
  const el = area.value
  if (el) {
    for (const [type, handler] of listeners) {
      el.removeEventListener(type, handler)
    }
  }
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  area.value = null
})
</script>

<style scoped>
.mouse-test {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  outline: none;
  color: var(--text);
  background: var(--bg);
}
.mouse-test__options {
  display: flex;
  gap: 0.5rem;
}
.mouse-test__options button {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.25rem 0.5rem;
}
</style>
