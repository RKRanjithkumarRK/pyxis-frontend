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

    const cssHeight = 80
    const getCssWidth = () => {
      const parentWidth = canvas.parentElement?.clientWidth ?? 300
      return Math.max(180, Math.min(parentWidth, 300))
    }

    const resizeCanvas = () => {
      const cssWidth = getCssWidth()
      const dpr = window.devicePixelRatio || 1
      canvas.width = cssWidth * dpr
      canvas.height = cssHeight * dpr
      canvas.style.width = `${cssWidth}px`
      canvas.style.height = `${cssHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      return { cssWidth, cssHeight }
    }

    let dimensions = resizeCanvas()

    const animate = () => {
      const { cssWidth, cssHeight: height } = dimensions
      ctx.clearRect(0, 0, cssWidth, height)

      const bars = barsRef.current
      const barWidth = 4
      const gap = 3
      const totalWidth = bars.length * (barWidth + gap)
      const startX = (cssWidth - totalWidth) / 2

      for (let i = 0; i < bars.length; i++) {
        if (active) {
          const target = Math.random() * 50 + 10
          bars[i] = bars[i] + (target - bars[i]) * 0.3
        } else {
          bars[i] = bars[i] * 0.9
        }

        const height = Math.max(bars[i], 3)
        const x = startX + i * (barWidth + gap)
        const y = (dimensions.cssHeight - height) / 2
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

    const handleResize = () => {
      dimensions = resizeCanvas()
    }

    let resizeObserver: ResizeObserver | null = null
    if ('ResizeObserver' in window && canvas.parentElement) {
      resizeObserver = new ResizeObserver(() => {
        handleResize()
      })
      resizeObserver.observe(canvas.parentElement)
    }

    window.addEventListener('resize', handleResize)
    animate()
    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', handleResize)
      resizeObserver?.disconnect()
    }
  }, [active])

  return (
    <canvas
      ref={canvasRef}
      className="h-[80px] w-full max-w-[300px]"
      style={{ height: 80 }}
    />
  )
}
