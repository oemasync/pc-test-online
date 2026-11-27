import { onMounted, onUnmounted, ref } from 'vue'

export type MediaErrorKind =
  | 'denied'
  | 'not-found'
  | 'in-use'
  | 'overconstrained'
  | 'insecure-context'
  | 'unsupported'
  | 'unknown'

export function mapMediaError(err: unknown): MediaErrorKind {
  const name =
    err && typeof err === 'object' && 'name' in err && typeof (err as { name: unknown }).name === 'string'
      ? (err as { name: string }).name
      : ''
  switch (name) {
    case 'NotAllowedError':
      return 'denied'
    case 'NotFoundError':
      return 'not-found'
    case 'NotReadableError':
    case 'AbortError':
      return 'in-use'
    case 'OverconstrainedError':
      return 'overconstrained'
    case 'SecurityError':
      return 'insecure-context'
    default:
      return 'unknown'
  }
}

export async function requestMediaStream(
  constraints: MediaStreamConstraints,
): Promise<{ stream: MediaStream | null; error: MediaErrorKind | null }> {
  if (!navigator.mediaDevices?.getUserMedia) {
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      return { stream: null, error: 'insecure-context' }
    }
    return { stream: null, error: 'unsupported' }
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    return { stream, error: null }
  } catch (err) {
    return { stream: null, error: mapMediaError(err) }
  }
}

export function useDevices(kind: MediaDeviceKind) {
  const devices = ref<MediaDeviceInfo[]>([])

  async function refresh(): Promise<void> {
    if (!navigator.mediaDevices?.enumerateDevices) {
      devices.value = []
      return
    }
    const all = await navigator.mediaDevices.enumerateDevices()
    devices.value = all.filter((d) => d.kind === kind)
  }

  onMounted(() => {
    void refresh()
    navigator.mediaDevices?.addEventListener('devicechange', refresh)
  })

  onUnmounted(() => {
    navigator.mediaDevices?.removeEventListener('devicechange', refresh)
  })

  return { devices, refresh }
}

export function useMediaStream() {
  const stream = ref<MediaStream | null>(null)

  function stop(): void {
    stream.value?.getTracks().forEach((t) => t.stop())
    stream.value = null
  }

  async function start(
    constraints: MediaStreamConstraints,
  ): Promise<{ stream: MediaStream | null; error: MediaErrorKind | null }> {
    stop()
    const result = await requestMediaStream(constraints)
    stream.value = result.stream
    return result
  }

  onUnmounted(stop)

  return { stream, start, stop }
}
