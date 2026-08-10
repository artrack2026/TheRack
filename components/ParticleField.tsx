'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  color: string
}

/** How close the cursor has to be to a dot before a line is drawn to it —
 *  matches the same distance-based fade used for dot-to-dot connections
 *  below, just centered on the pointer instead. */
const MOUSE_LINK_RADIUS = 160

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf: number
    const particles: Particle[] = []
    const count = 60
    // null = pointer isn't over this canvas right now, so no lines to it.
    const mouse: ({ x: number; y: number } | null)[] = [null]

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    const init = () => {
      particles.length = 0
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.6 + 0.3,
          color: [
            '#e05858', '#e07838', '#d4b030', '#3ab870',
            '#1ab4c0', '#3878e0', '#8844d8', '#d84490',
          ][Math.floor(Math.random() * 8)],
        })
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.strokeStyle = particles[i].color
            ctx.globalAlpha = (1 - dist / 120) * 0.15
            ctx.lineWidth = 0.5
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      // Draw lines from nearby dots to the pointer, same fade-by-distance
      // logic as above but a touch stronger so the pointer trail reads
      // clearly against the dot-to-dot web.
      const m = mouse[0]
      if (m) {
        for (const p of particles) {
          const dx = p.x - m.x
          const dy = p.y - m.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < MOUSE_LINK_RADIUS) {
            ctx.beginPath()
            ctx.strokeStyle = p.color
            ctx.globalAlpha = (1 - dist / MOUSE_LINK_RADIUS) * 0.5
            ctx.lineWidth = 0.8
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(m.x, m.y)
            ctx.stroke()
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.opacity
        ctx.fill()

        p.x += p.vx
        p.y += p.vy

        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
      }

      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }

    const handleResize = () => { resize(); init() }

    // Listens on window (not the canvas) since the canvas has
    // pointer-events-none — it never receives mouse events directly, so
    // hovering it doesn't block clicks on whatever's layered above it.
    // clientX/Y are converted to canvas-local coordinates, and set back to
    // null once the pointer leaves this canvas's bounds so lines don't
    // keep pointing at a stale position on a tall page.
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      mouse[0] = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height ? { x, y } : null
    }

    resize()
    init()
    draw()

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.85 }}
    />
  )
}
