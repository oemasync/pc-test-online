import { onMounted, onUnmounted, ref } from 'vue'

export function useReducedMotion() {
  const reduced = ref(false)
  let mq: MediaQueryList | null = null

  const update = (): void => {
    reduced.value = Boolean(mq?.matches)
  }

  onMounted(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduced.value = Boolean(mq?.matches)
    mq?.addEventListener('change', update)
  })

  onUnmounted(() => {
    mq?.removeEventListener('change', update)
    mq = null
  })

  return { reduced }
}
