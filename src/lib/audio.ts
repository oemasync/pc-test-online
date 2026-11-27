let context: AudioContext | null = null

export function getAudioContext(): AudioContext | null {
  if (context) return context
  const Ctor =
    typeof window !== 'undefined'
      ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      : undefined
  if (!Ctor) return null
  context = new Ctor()
  return context
}

export async function resumeAudioContext(): Promise<AudioContext | null> {
  const ctx = getAudioContext()
  if (!ctx) return null
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch (err) {
      console.debug('audio: failed to resume AudioContext', err)
    }
  }
  return ctx
}
