import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { WidgetProps } from '../types'
import type { SoundLevelConfig } from './configs'
import { Segmented, Setting, SettingsView, Stepper } from './controls'

/** Microphone volume meter (FFT average → 0–100). */
export default function SoundLevel({ config, update, settings, closeSettings }: WidgetProps<SoundLevelConfig>) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [level, setLevel] = useState(0)
  const [peak, setPeak] = useState(0)
  const stop = useRef<() => void>(() => {})
  const sensitivity = useRef(config.sensitivity)
  useEffect(() => {
    sensitivity.current = config.sensitivity
  }, [config.sensitivity])

  useEffect(() => () => stop.current(), [])

  const start = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.6
      ctx.createMediaStreamSource(stream).connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      let raf = 0
      let smooth = 0
      const loop = () => {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        const v = Math.min(100, (avg / 128) * 100 * sensitivity.current)
        smooth = smooth * 0.7 + v * 0.3
        setLevel(smooth)
        setPeak((p) => Math.max(p, smooth))
        raf = requestAnimationFrame(loop)
      }
      loop()
      stop.current = () => {
        cancelAnimationFrame(raf)
        stream.getTracks().forEach((t) => t.stop())
        void ctx.close()
        setListening(false)
        setLevel(0)
      }
      setListening(true)
    } catch {
      setError('Microphone not available. Allow microphone access in your browser to use the meter.')
    }
  }

  if (settings)
    return (
      <SettingsView onDone={closeSettings}>
        <Setting label="Sensitivity">
          <Stepper
            label="Sensitivity"
            value={config.sensitivity}
            min={0.5}
            max={3}
            step={0.25}
            format={(v) => `${v.toFixed(2)}×`}
            onChange={(s) => update({ sensitivity: s })}
          />
        </Setting>
        <Setting label="Too loud at">
          <Stepper
            label="Threshold"
            value={config.threshold}
            min={30}
            max={90}
            step={5}
            format={(v) => `${v}%`}
            onChange={(threshold) => update({ threshold })}
          />
        </Setting>
        <Setting label="Style">
          <Segmented
            label="Style"
            value={config.style}
            options={[
              { value: 'bar', label: 'Bar' },
              { value: 'emoji', label: 'Emoji' },
            ]}
            onChange={(style) => update({ style })}
          />
        </Setting>
        <Button size="sm" icon={RotateCcw} onClick={() => setPeak(0)}>
          Reset peak
        </Button>
      </SettingsView>
    )

  const loud = level >= config.threshold
  const zone = loud ? 'loud' : level >= config.threshold * 0.7 ? 'warn' : 'ok'
  const color = zone === 'loud' ? '#ef4444' : zone === 'warn' ? '#f59e0b' : '#22c55e'

  return (
    <div className={cn('flex h-full flex-col gap-2 p-3 transition-colors', loud && listening && 'bg-danger/10')}>
      {error ? (
        <p className="grid flex-1 place-items-center text-center text-sm text-danger">{error}</p>
      ) : config.style === 'emoji' ? (
        <div className="grid flex-1 place-items-center" aria-live="polite">
          <span
            className="text-[64px] leading-none"
            role="img"
            aria-label={zone === 'loud' ? 'Too loud' : zone === 'warn' ? 'Getting loud' : 'Quiet'}
          >
            {!listening ? '🎤' : zone === 'loud' ? '🔴' : zone === 'warn' ? '🟡' : '🟢'}
          </span>
        </div>
      ) : (
        <div
          className="relative flex-1 overflow-hidden rounded-xl bg-ink/6"
          role="meter"
          aria-valuenow={Math.round(level)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Sound level"
        >
          <div
            className="absolute inset-x-0 bottom-0 transition-[height] duration-75"
            style={{ height: `${level}%`, backgroundColor: color }}
          />
          <div
            className="absolute inset-x-0 border-t-2 border-dashed border-danger"
            style={{ bottom: `${config.threshold}%` }}
            aria-hidden
          />
          {peak > 0 && <div className="absolute inset-x-0 h-0.5 bg-ink/40" style={{ bottom: `${peak}%` }} aria-hidden />}
          <span className="absolute top-1.5 left-2 text-xs font-bold text-ink-soft tabular-nums">{Math.round(level)}%</span>
        </div>
      )}
      <Button
        size="sm"
        variant={listening ? 'secondary' : 'primary'}
        icon={listening ? MicOff : Mic}
        onClick={() => (listening ? stop.current() : void start())}
      >
        {listening ? 'Stop' : 'Start listening'}
      </Button>
    </div>
  )
}
