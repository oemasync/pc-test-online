<template>
  <TestLayout
    test-id="webcam"
    :title="t('tests.webcam.title')"
    :details="details"
    :can-pass="canPass"
  >
    <template #instructions>
      {{ t('tests.webcam.instructions') }}
    </template>

    <PermissionPrompt :kind="error" />

    <div class="webcam-test">
      <div class="webcam-test__preview-wrap">
        <video
          ref="videoRef"
          class="webcam-test__video"
          :class="{ 'webcam-test__video--mirror': mirror }"
          autoplay
          playsinline
          muted
        />
      </div>

      <div class="webcam-test__controls">
        <label class="webcam-test__field">
          <span>{{ t('tests.webcam.deviceLabel') }}</span>
          <DeviceSelect
            v-model="selectedDeviceId"
            :devices="devices"
          />
        </label>
        <label class="webcam-test__field webcam-test__field--inline">
          <input
            v-model="mirror"
            type="checkbox"
          >
          <span>{{ t('tests.webcam.mirrorLabel') }}</span>
        </label>
        <button
          type="button"
          class="webcam-test__button"
          @click="captureSnapshot"
        >
          {{ t('tests.webcam.snapshotButton') }}
        </button>
      </div>

      <div
        class="webcam-test__readouts"
        aria-live="polite"
      >
        <StatTile
          :label="t('tests.webcam.resolutionLabel')"
          :value="resolutionText"
        />
        <StatTile
          :label="t('tests.webcam.reportedFpsLabel')"
          :value="reportedFpsText"
        />
        <StatTile
          :label="t('tests.webcam.measuredFpsLabel')"
          :value="measuredFpsText"
        />
        <StatTile
          :label="t('tests.webcam.aspectRatioLabel')"
          :value="aspectRatioText"
        />
        <StatTile
          :label="t('tests.webcam.facingModeLabel')"
          :value="facingModeText"
        />
      </div>

      <section class="webcam-test__capabilities">
        <h3>{{ t('tests.webcam.capabilitiesLabel') }}</h3>
        <p v-if="!hasCapabilities">
          {{ t('tests.webcam.noCapabilities') }}
        </p>
        <ul v-else>
          <li>width: {{ rangeText(capabilities?.width) }}</li>
          <li>height: {{ rangeText(capabilities?.height) }}</li>
          <li>frameRate: {{ rangeText(capabilities?.frameRate) }}</li>
        </ul>
      </section>

      <div
        v-if="coveredLens"
        class="webcam-test__warning"
        role="status"
      >
        {{ t('tests.webcam.coveredLensWarning') }}
      </div>
      <div
        v-if="frameStalled"
        class="webcam-test__warning"
        role="status"
      >
        {{ t('tests.webcam.stalledWarning') }}
      </div>
      <div
        v-if="staticFrame"
        class="webcam-test__warning"
        role="status"
      >
        {{ t('tests.webcam.staticWarning') }}
      </div>

      <canvas
        ref="canvasRef"
        class="webcam-test__canvas"
      />
    </div>
  </TestLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import TestLayout from '@/ui/TestLayout.vue'
import DeviceSelect from '@/ui/DeviceSelect.vue'
import PermissionPrompt from '@/ui/PermissionPrompt.vue'
import StatTile from '@/ui/StatTile.vue'
import { useDevices, useMediaStream, mapMediaError } from '@/lib/media'
import type { MediaErrorKind } from '@/lib/media'
import {
  estimateFps,
  frameDifference,
  isCoveredLens,
  isFrameStalled,
  isStaticFrame,
  luminanceStats,
} from './logic'

const { t } = useI18n()
const { devices, refresh: refreshDevices } = useDevices('videoinput')
const media = useMediaStream()

const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const selectedDeviceId = ref('')
const mirror = ref(false)
const error = ref<MediaErrorKind | null>(null)

const settings = ref<MediaTrackSettings | null>(null)
const capabilities = ref<MediaTrackCapabilities | null>(null)
const trackRef = ref<MediaStreamTrack | null>(null)
const measuredFps = ref(0)
const luminance = ref<ReturnType<typeof luminanceStats> | null>(null)
const coveredLens = ref(false)
const frameStalled = ref(false)
const staticFrame = ref(false)
const snapshotCaptured = ref(false)

const timestamps: number[] = []
const differences: number[] = []
let previousFrame: Uint8ClampedArray | null = null
let rVfcId = 0
let rafId = 0
let running = false
let measuredVideo: HTMLVideoElement | null = null

const resolutionText = computed(() => {
  const current = settings.value
  if (!current?.width || !current.height) return '-'
  return `${current.width} × ${current.height}`
})
const reportedFpsText = computed(() => settings.value?.frameRate?.toFixed(1) ?? '-')
const measuredFpsText = computed(() => measuredFps.value.toFixed(1))
const aspectRatioText = computed(() => settings.value?.aspectRatio?.toFixed(2) ?? '-')
const facingModeText = computed(() => settings.value?.facingMode ?? '-')
const hasCapabilities = computed(() => !!capabilities.value)
const canPass = computed(() => measuredFps.value > 0)

const details = computed(() => ({
  width: settings.value?.width ?? 0,
  height: settings.value?.height ?? 0,
  frameRate: settings.value?.frameRate ?? 0,
  measuredFps: Number(measuredFps.value.toFixed(2)),
  aspectRatio: settings.value?.aspectRatio ?? 0,
  facingMode: settings.value?.facingMode ?? '',
  deviceId: settings.value?.deviceId ?? '',
  groupId: settings.value?.groupId ?? '',
  capabilitiesWidthMin: rangeMin(capabilities.value?.width),
  capabilitiesWidthMax: rangeMax(capabilities.value?.width),
  capabilitiesHeightMin: rangeMin(capabilities.value?.height),
  capabilitiesHeightMax: rangeMax(capabilities.value?.height),
  capabilitiesFrameRateMin: rangeMin(capabilities.value?.frameRate),
  capabilitiesFrameRateMax: rangeMax(capabilities.value?.frameRate),
  mirrored: mirror.value,
  luminanceMean: luminance.value?.mean ?? 0,
  luminanceVariance: luminance.value?.variance ?? 0,
  coveredLens: coveredLens.value,
  frameStalled: frameStalled.value,
  staticFrame: staticFrame.value,
  frozenFrame: frameStalled.value || staticFrame.value,
  snapshotCaptured: snapshotCaptured.value,
}))

function rangeMin(
  value: number | (MediaTrackConstraintSet & { min?: number }) | undefined
): number {
  if (value && typeof value === 'object' && 'min' in value && typeof value.min === 'number') {
    return value.min
  }
  return typeof value === 'number' ? value : 0
}

function rangeMax(
  value: number | (MediaTrackConstraintSet & { max?: number }) | undefined
): number {
  if (value && typeof value === 'object' && 'max' in value && typeof value.max === 'number') {
    return value.max
  }
  return typeof value === 'number' ? value : 0
}

function rangeText(
  value: number | (MediaTrackConstraintSet & { min?: number; max?: number }) | undefined
): string {
  const min = rangeMin(value)
  const max = rangeMax(value)
  if (min === 0 && max === 0) return '-'
  return `${min} - ${max}`
}

function sampleFrame(): void {
  const video = videoRef.value
  const canvas = canvasRef.value
  if (!video || !canvas || video.videoWidth === 0) return
  const width = 64
  const height = 48
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return
  context.drawImage(video, 0, 0, width, height)
  const data = context.getImageData(0, 0, width, height).data
  const stats = luminanceStats(data)
  luminance.value = stats
  coveredLens.value = isCoveredLens(stats)

  if (previousFrame) {
    differences.push(frameDifference(previousFrame, data))
    if (differences.length > 60) differences.shift()
  }
  previousFrame = data.slice()
  staticFrame.value = isStaticFrame(differences, 0.25, 30)
}

function onVideoFrame(now: number, metadata?: { presentationTime?: number }): void {
  if (!running) return
  const presentationTime = metadata?.presentationTime ?? now
  timestamps.push(presentationTime)
  if (timestamps.length > 60) timestamps.shift()
  measuredFps.value = estimateFps(timestamps)
  frameStalled.value = isFrameStalled(timestamps, now, 1000)
  sampleFrame()

  const video = videoRef.value
  if (video && typeof video.requestVideoFrameCallback === 'function') {
    rVfcId = video.requestVideoFrameCallback(onVideoFrame)
  } else {
    rafId = requestAnimationFrame(onVideoFrame)
  }
}

function stopMeasurement(): void {
  running = false
  const video = measuredVideo
  if (video && rVfcId && typeof video.cancelVideoFrameCallback === 'function') {
    video.cancelVideoFrameCallback(rVfcId)
  }
  if (rafId) cancelAnimationFrame(rafId)
  rVfcId = 0
  rafId = 0
  measuredVideo = null
}

async function attachAndMeasure(): Promise<void> {
  const video = videoRef.value
  const stream = media.stream.value
  if (!video || !stream) return
  video.srcObject = stream
  measuredVideo = video
  try {
    await video.play()
  } catch (err) {
    error.value = mapMediaError(err)
  }

  const currentTrack = stream.getVideoTracks()[0] ?? null
  trackRef.value = currentTrack
  if (currentTrack) {
    settings.value = currentTrack.getSettings()
    capabilities.value = currentTrack.getCapabilities ? currentTrack.getCapabilities() : null
  }

  timestamps.length = 0
  differences.length = 0
  previousFrame = null
  measuredFps.value = 0
  running = true

  if (typeof video.requestVideoFrameCallback === 'function') {
    rVfcId = video.requestVideoFrameCallback(onVideoFrame)
  } else {
    rafId = requestAnimationFrame(onVideoFrame)
  }
}

async function startCamera(deviceId?: string): Promise<void> {
  error.value = null
  stopMeasurement()
  const constraints: MediaStreamConstraints = deviceId
    ? { video: { deviceId: { exact: deviceId } } }
    : { video: true }
  const result = await media.start(constraints)
  if (result.error) {
    error.value = result.error
    return
  }
  await attachAndMeasure()
  await refreshDevices()
  const currentDeviceId = trackRef.value?.getSettings().deviceId
  if (currentDeviceId && !selectedDeviceId.value) {
    selectedDeviceId.value = currentDeviceId
  }
}

function captureSnapshot(): void {
  const video = videoRef.value
  const canvas = canvasRef.value
  if (!video || !canvas || video.videoWidth === 0) return
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const context = canvas.getContext('2d')
  if (!context) return
  if (mirror.value) {
    context.translate(canvas.width, 0)
    context.scale(-1, 1)
  }
  context.drawImage(video, 0, 0)
  snapshotCaptured.value = true
  canvas.toBlob(blob => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'webcam-snapshot.png'
    link.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}

watch(selectedDeviceId, (newId, oldId) => {
  if (!oldId || newId === oldId) return
  void startCamera(newId)
})

onMounted(() => {
  void startCamera()
})

onUnmounted(() => {
  stopMeasurement()
  media.stop()
})
</script>

<style scoped>
.webcam-test {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.webcam-test__preview-wrap {
  max-width: 100%;
}
.webcam-test__video {
  width: 100%;
  max-width: 640px;
  border-radius: 8px;
  background: var(--bg, #000);
}
.webcam-test__video--mirror {
  transform: scaleX(-1);
}
.webcam-test__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}
.webcam-test__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.webcam-test__field--inline {
  flex-direction: row;
  align-items: center;
}
.webcam-test__button {
  padding: 0.35rem 0.75rem;
}
.webcam-test__readouts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.5rem;
}
.webcam-test__capabilities ul {
  margin: 0;
  padding-left: 1.25rem;
}
.webcam-test__warning {
  color: var(--color-danger, #ef4444);
}
.webcam-test__canvas {
  display: none;
}
@media (max-width: 360px) {
  .webcam-test__readouts {
    grid-template-columns: 1fr;
  }
}
</style>
