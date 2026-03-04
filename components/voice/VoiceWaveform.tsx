'use client'

import { useEffect, useRef } from 'react'

interface Props {
  active: boolean
}

export default function VoiceWaveform({ active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const barsRef = useRef<number[]>(Array(40).fill(0))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = 300 * dpr
    canvas.height = 80 * dpr
    ctx.scale(dpr, dpr)

    const animate = () => {
      ctx.clearRect(0, 0, 300, 80)

      const bars = barsRef.current
      const barWidth = 4
      const gap = 3
      const totalWidth = bars.length * (barWidth + gap)
      const startX = (300 - totalWidth) / 2

      for (let i = 0; i < bars.length; i++) {
        // Generate organic-looking heights
        if (active) {
          const target = Math.random() * 50 + 10
          bars[i] = bars[i] + (target - bars[i]) * 0.3
        } else {
          bars[i] = bars[i] * 0.9
        }

        const height = Math.max(bars[i], 3)
        const x = startX + i * (barWidth + gap)
        const y = (80 - height) / 2

        // Gradient color based on position
        const progress = i / bars.length
        const r = Math.round(16 + progress * 0)
        const g = Math.round(163 - progress * 50)
        const b = Math.round(127 + progress * 30)

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, height, 2)
        ctx.fill()
      }

      animRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(animRef.current)
  }, [active])

  return (
    <canvas
      ref={canvasRef}
      className="w-[300px] h-[80px]"
      style={{ width: 300, height: 80 }}
    />
  )
}
