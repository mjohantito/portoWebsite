import gsap from 'gsap'

/**
 * Embers / fireflies: a handful of soft dots drifting slowly upward on a 2D
 * canvas. Driven by GSAP's ticker (the page's one rAF loop) and only while
 * start() is in effect, so it costs nothing offscreen.
 *
 * `strength` scales their brightness (1 = full).
 */

const MAX_PARTICLES = 40
const YELLOW = '243, 213, 67'
const ORANGE = '255, 138, 61'

interface Ember {
  x: number
  y: number
  speed: number // px per second, upward
  radius: number
  sway: number // horizontal wander, px
  swayRate: number
  phase: number
  life: number // 0-1 along its rise
  color: string
}

export function createEmbers(canvas: HTMLCanvasElement, count: number, strength = 1) {
  const context = canvas.getContext('2d')
  const total = Math.min(count, MAX_PARTICLES)
  const embers: Ember[] = []
  let width = 0
  let height = 0
  let running = false

  const spawn = (ember: Partial<Ember>, fresh: boolean): Ember => {
    ember.x = Math.random() * width
    // first fill is spread over the whole area; afterwards embers rise from the ground
    ember.life = fresh ? Math.random() : 0
    ember.y = height * (1 - ember.life * 0.9) + 8
    ember.speed = 7 + Math.random() * 16
    ember.radius = 0.7 + Math.random() * 1.1
    ember.sway = 6 + Math.random() * 18
    ember.swayRate = 0.25 + Math.random() * 0.55
    ember.phase = Math.random() * Math.PI * 2
    ember.color = Math.random() < 0.7 ? YELLOW : ORANGE
    return ember as Ember
  }

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    width = canvas.clientWidth
    height = canvas.clientHeight
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    context?.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (embers.length === 0 && width > 0) {
      for (let i = 0; i < total; i++) embers.push(spawn({}, true))
    }
  }

  const draw = (time: number, deltaTime: number) => {
    if (!context) return
    const dt = Math.min(deltaTime, 64) / 1000
    context.clearRect(0, 0, width, height)

    for (const ember of embers) {
      ember.y -= ember.speed * dt
      ember.life += (ember.speed * dt) / (height * 0.9)
      if (ember.life >= 1 || ember.y < -10) spawn(ember, false)

      const x = ember.x + Math.sin(time * ember.swayRate + ember.phase) * ember.sway
      // fade in near the ground, out toward the top, with a slow firefly pulse
      const envelope = Math.sin(Math.min(ember.life, 1) * Math.PI)
      const pulse = 0.6 + 0.4 * Math.sin(time * 1.7 + ember.phase * 3)
      const alpha = envelope * pulse * strength

      context.fillStyle = `rgba(${ember.color}, ${(alpha * 0.14).toFixed(3)})`
      context.beginPath()
      context.arc(x, ember.y, ember.radius * 4, 0, Math.PI * 2)
      context.fill()

      context.fillStyle = `rgba(${ember.color}, ${(alpha * 0.9).toFixed(3)})`
      context.beginPath()
      context.arc(x, ember.y, ember.radius, 0, Math.PI * 2)
      context.fill()
    }
  }

  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()

  return {
    start() {
      if (running) return
      running = true
      gsap.ticker.add(draw)
    },
    stop() {
      if (!running) return
      running = false
      gsap.ticker.remove(draw)
    },
    destroy() {
      this.stop()
      observer.disconnect()
      context?.clearRect(0, 0, width, height)
    },
  }
}
