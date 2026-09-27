/** Short synthesised sounds (no audio files to download or cache). */

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, start: number, length: number, type: OscillatorType = 'sine', gain = 0.25) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + start
  const osc = a.createOscillator()
  const g = a.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t + length)
  osc.connect(g).connect(a.destination)
  osc.start(t)
  osc.stop(t + length + 0.05)
}

/** Timer alarm: three rising double-beeps (about 2.5 s). */
export function playAlarm() {
  for (let i = 0; i < 3; i++) {
    tone(880, i * 0.8, 0.25, 'square', 0.15)
    tone(1175, i * 0.8 + 0.3, 0.35, 'square', 0.15)
  }
}

/** Soft tick while names roll or the spinner turns. */
export const playTick = () => tone(1400, 0, 0.04, 'triangle', 0.08)

/** Cheerful chime for a pick / result. */
export function playChime() {
  tone(784, 0, 0.3)
  tone(988, 0.1, 0.3)
  tone(1319, 0.2, 0.5)
}

/** Unlock audio on the first user gesture (browsers block it until then). */
export const primeAudio = () => void audio()
