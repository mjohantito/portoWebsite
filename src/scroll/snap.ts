import gsap from 'gsap'
import { Observer } from 'gsap/Observer'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type Lenis from 'lenis'

gsap.registerPlugin(Observer, ScrollTrigger)

/*
 * Section snapping: the page's one snap system.
 *
 * GSAP Observer watches wheel and touch input, a key listener watches the
 * keyboard, and every movement is a Lenis scrollTo. Lenis itself is told (via
 * its virtualScroll hook, see gate()) not to scroll on its own while snapping
 * is on, so nothing else moves the page.
 *
 * STOPS
 *   Every element with [data-snap] is a stop, in DOM order:
 *     data-snap            top of the section at the top of the viewport
 *     data-snap="center"   section centred in the viewport (the quote)
 *   A section can replace its stops with its own list (setSectionStops): the
 *   pinned Selected Work has one per project.
 *   A section taller than the viewport gets two stops, its start and its end,
 *   and scrolls freely in between.
 *
 * GESTURES
 *   One gesture moves one stop. A wheel/trackpad gesture lasts until the input
 *   goes quiet, so a long spin or a trackpad's inertia tail is still one
 *   gesture. Input during a glide is ignored.
 *
 * ENTRANCES
 *   Sections register their entrance animation here (registerEntrance). When a
 *   glide heads for a section, its entrance starts partway through the glide,
 *   so the content is in place just after landing. Sections a long glide passes
 *   over are put straight into their final state. Without snapping (phones,
 *   or a section being scrolled freely) the same entrances run from a plain
 *   ScrollTrigger instead.
 */

const GLIDE = 1.1 // seconds per stop
const ENTRANCE_LEAD = 0.42 // entrances start this far through the glide
const EPS = 2 // px: positions closer than this count as equal
const QUIET = 110 // ms without wheel input before the next event starts a new gesture
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp = gsap.utils.clamp

/** Snapping is for motion-friendly, non-phone contexts. Touch devices below 900px scroll normally. */
export function snapWanted() {
  const query = (q: string) => window.matchMedia(q).matches
  return (
    query('(prefers-reduced-motion: no-preference)') &&
    !(query('(hover: none) and (pointer: coarse)') && query('(max-width: 899.98px)'))
  )
}

/* ==========================================================================
   Registry: filled by the sections, read by the controller
   ========================================================================== */

type StopProvider = () => number[] | null
const stopProviders = new Map<Element, StopProvider>()

/** Lets a section define its own stop positions (page Y values). Return null to use the default. */
export function setSectionStops(section: Element, provider: StopProvider) {
  stopProviders.set(section, provider)
  return () => {
    stopProviders.delete(section)
  }
}

interface Entrance {
  el: Element
  section: Element
  play: () => void
  finish: () => void
  done: boolean
  trigger: ScrollTrigger | null
  delayed: gsap.core.Tween | null
}
const entrances = new Set<Entrance>()
let controller: SnapController | null = null

function runEntrance(entry: Entrance, delay: number) {
  if (entry.done) return
  entry.done = true
  entry.trigger?.kill()
  entry.trigger = null
  if (delay > 0) entry.delayed = gsap.delayedCall(delay, entry.play)
  else entry.play()
}

function finishEntrance(entry: Entrance) {
  if (entry.done) return
  entry.done = true
  entry.trigger?.kill()
  entry.trigger = null
  entry.finish()
}

/**
 * Registers an entrance animation for `el`.
 *   play    start the animation
 *   finish  jump straight to its end state
 *   start   ScrollTrigger start used when the page is not snapping
 */
export function registerEntrance(
  el: Element,
  handlers: { play: () => void; finish: () => void },
  start = 'top 78%',
) {
  const entry: Entrance = {
    el,
    section: el.closest('[data-snap]') ?? el,
    ...handlers,
    done: false,
    trigger: null,
    delayed: null,
  }
  entry.trigger = ScrollTrigger.create({
    trigger: el,
    start,
    onEnter: () => {
      // While snapping, arrivals start entrances (see glide), except inside a
      // tall section, where content further down is reached by free scrolling.
      if (!controller || controller.isTall(entry.section)) runEntrance(entry, 0)
    },
  })
  entrances.add(entry)

  return () => {
    entry.trigger?.kill()
    entry.delayed?.kill()
    entrances.delete(entry)
  }
}

/**
 * Puts every entrance of a section straight into its final state, started or
 * not. Used when a page transition lands on a section that must already be
 * in place.
 */
export function completeEntrances(section: Element) {
  for (const entry of entrances) {
    if (entry.section !== section) continue
    entry.done = true
    entry.trigger?.kill()
    entry.trigger = null
    entry.delayed?.kill()
    entry.finish()
  }
}

/* ==========================================================================
   Controller
   ========================================================================== */

interface Stop {
  id: string
  y: number
  el: HTMLElement
}

interface FreeRange {
  el: HTMLElement
  from: number
  to: number
}

export interface SnapController {
  /** Lenis virtualScroll hook: false keeps Lenis from scrolling by itself. */
  gate: (data: { event: Event }) => boolean
  /** Glide to a stop by id ("about", "work:2") or to a section's first stop. */
  goTo: (id: string) => boolean
  currentId: () => string | null
  isTall: (section: Element) => boolean
  /** While locked, all input is swallowed and nothing moves (page transitions). */
  setLocked: (locked: boolean) => void
  destroy: () => void
}

const pageTop = (el: Element) => el.getBoundingClientRect().top + window.scrollY

/** A wheel/touch event that belongs to a scrollable element inside the page. */
function belongsToNestedScroller(event: Event, horizontal: boolean) {
  const target = event.target instanceof Element ? event.target : null
  if (!target) return false
  if (horizontal) return Boolean(target.closest('[data-scroll-x]'))
  const area = target.closest('textarea')
  return Boolean(area && area.scrollHeight > area.clientHeight + 1)
}

export function createSnap(
  lenis: Lenis,
  root: HTMLElement,
  initialId: string | null,
  /** called once, after the first measurement and the opening position are in place */
  onReady?: () => void,
): SnapController {
  let stops: Stop[] = []
  let free: FreeRange[] = []
  let ready = false
  let locked = false
  let gliding = false
  let lastId: string | null = null
  let releaseTimer: gsap.core.Tween | null = null
  let alive = true

  /* ---------- Stops ---------- */

  const compute = () => {
    const vh = window.innerHeight
    const max = Math.max(0, document.documentElement.scrollHeight - vh)
    const next: Stop[] = []
    free = []

    root.querySelectorAll<HTMLElement>('[data-snap]').forEach((el, i) => {
      const id = el.id || `stop-${i}`
      const top = pageTop(el)
      const height = el.offsetHeight
      const custom = stopProviders.get(el)?.()

      if (custom?.length) {
        custom.forEach((y, k) => next.push({ id: `${id}:${k}`, y, el }))
      } else if (el.dataset.snap === 'center') {
        next.push({ id, y: top + height / 2 - vh / 2, el })
      } else if (height > vh + 4) {
        next.push({ id, y: top, el }, { id: `${id}:end`, y: top + height - vh, el })
        free.push({ el, from: Math.round(top), to: Math.round(top + height - vh) })
      } else {
        next.push({ id, y: top, el })
      }
    })

    stops = next
      .map((stop) => ({ ...stop, y: Math.round(clamp(0, max, stop.y)) }))
      .filter((stop, i, all) => i === 0 || stop.y - all[i - 1].y > EPS)
    // anything below the last section is reachable too
    const last = stops[stops.length - 1]
    if (last && max - last.y > 4) stops.push({ id: 'end', y: max, el: last.el })
  }

  const findStop = (id: string) =>
    stops.find((stop) => stop.id === id) ??
    stops.find((stop) => stop.el.id === id) ??
    stops.find((stop) => stop.id.startsWith(`${id}:`))

  const nearestStop = (y: number) =>
    stops.reduce((best, stop) => (Math.abs(stop.y - y) < Math.abs(best.y - y) ? stop : best))

  /** The free range around a position, if it is inside (or at the edge of) one. */
  const freeRangeAt = (y: number) =>
    free.find((range) => y > range.from - EPS && y < range.to + EPS) ?? null

  const isTall = (section: Element) => free.some((range) => range.el === section)

  /* ---------- Entrances ---------- */

  const startEntrances = (stop: Stop, from: number, delay: number) => {
    const low = Math.min(from, stop.y)
    const high = Math.max(from, stop.y)
    const fold = stop.y + window.innerHeight * 0.92

    for (const entry of entrances) {
      if (entry.done) continue
      if (entry.section === stop.el) {
        // only what will be on screen; the rest of a tall section waits for its ScrollTrigger
        if (pageTop(entry.el) < fold) runEntrance(entry, delay)
      } else {
        const top = pageTop(entry.section)
        if (top > low + EPS && top < high - EPS) finishEntrance(entry) // passed on the way
      }
    }
  }

  /* ---------- Movement: always Lenis ---------- */

  const release = () => {
    releaseTimer?.kill()
    releaseTimer = null
    gliding = false
  }

  const glide = (stop: Stop, duration = GLIDE) => {
    const from = lenis.scroll
    lastId = stop.id
    if (Math.abs(stop.y - from) < 1) return

    gliding = true
    startEntrances(stop, from, duration * ENTRANCE_LEAD)
    lenis.scrollTo(stop.y, {
      duration,
      easing: easeInOut,
      lock: true,
      force: true,
      onComplete: () => {
        release()
        // stops may have been re-measured mid-glide (late image, resize)
        const now = findStop(stop.id)
        if (alive && now && Math.abs(now.y - lenis.scroll) > EPS) jump(now)
      },
    })
    // never stay locked if the glide is interrupted from outside
    releaseTimer?.kill()
    releaseTimer = gsap.delayedCall(duration + 0.5, release)
  }

  const jump = (stop: Stop) => {
    lastId = stop.id
    lenis.scrollTo(stop.y, { immediate: true, force: true })
    startEntrances(stop, stop.y, 0)
  }

  /**
   * Moves one stop in `direction`. Returns false when the position is inside a
   * tall section with room left to scroll: the caller then scrolls freely.
   */
  const step = (direction: 1 | -1) => {
    const position = lenis.targetScroll
    const range = freeRangeAt(position)
    if (range && (direction > 0 ? position < range.to - EPS : position > range.from + EPS)) {
      return false
    }
    const target =
      direction > 0
        ? stops.find((stop) => stop.y > position + EPS)
        : [...stops].reverse().find((stop) => stop.y < position - EPS)
    if (target) glide(target)
    return true
  }

  /** Free scrolling inside a tall section, kept within its start and end. */
  const scrollFree = (delta: number, immediate = false) => {
    const range = freeRangeAt(lenis.targetScroll)
    if (!range) return
    const target = clamp(range.from, range.to, lenis.targetScroll + delta)
    if (immediate) lenis.scrollTo(target, { immediate: true, force: true })
    else lenis.scrollTo(target, { programmatic: false, lerp: 0.1 })
  }

  /* ---------- Wheel + trackpad ---------- */

  let lastWheel = 0
  let previousSize = 0
  let rising = 0
  let wheelGesture: { mode: 'step' | 'free' | null; travelled: number } = {
    mode: 'step',
    travelled: 0,
  }

  const onWheel = (self: Observer) => {
    const event = self.event as WheelEvent
    const horizontal = Math.abs(self.deltaX) > Math.abs(self.deltaY)
    if (event.ctrlKey || horizontal || belongsToNestedScroller(event, false)) return
    const delta = self.deltaY
    if (!delta) return

    // A new gesture starts when input has been quiet, or when deltas climb
    // again after a glide (a second swipe on top of a trackpad's inertia tail).
    const now = performance.now()
    const size = Math.abs(delta)
    rising = size > previousSize + 2 ? rising + 1 : 0
    const quiet = now - lastWheel > QUIET
    const surge = !gliding && wheelGesture.mode === 'step' && rising >= 3 && size >= 24
    lastWheel = now
    previousSize = size

    if (gliding || !ready || locked) return
    if (quiet || surge) {
      wheelGesture = { mode: null, travelled: 0 }
      rising = 0
    }
    if (wheelGesture.mode === 'step') return // this gesture has had its stop
    if (wheelGesture.mode === 'free') return scrollFree(delta)

    // ignore the first few pixels, so a resting finger does not turn the page
    wheelGesture.travelled += delta
    if (Math.abs(wheelGesture.travelled) < 6) return
    if (step(delta > 0 ? 1 : -1)) {
      wheelGesture.mode = 'step'
    } else {
      wheelGesture.mode = 'free'
      scrollFree(wheelGesture.travelled)
    }
  }

  /* ---------- Touch (tablets and touch laptops; phones are not snapped) ---------- */

  let touchMode: 'step' | 'free' | null = null

  const onDrag = (self: Observer) => {
    if (self.axis === 'x' || gliding || !ready || locked) return
    const y = self.y ?? 0
    const travelled = y - (self.startY ?? y) // finger down = page up
    if (touchMode === 'free') return scrollFree(-self.deltaY, true)
    if (touchMode === 'step' || Math.abs(travelled) < 28) return
    if (step(travelled < 0 ? 1 : -1)) {
      touchMode = 'step'
    } else {
      touchMode = 'free'
      scrollFree(-travelled, true)
    }
  }

  const observer = Observer.create({
    target: window,
    type: 'wheel,touch',
    debounce: false,
    lockAxis: true,
    onWheel,
    onPress: () => {
      touchMode = null
    },
    onDrag,
  })

  const gate: SnapController['gate'] = ({ event }) => {
    if (event.type === 'wheel') {
      const wheel = event as WheelEvent
      const horizontal = Math.abs(wheel.deltaX) > Math.abs(wheel.deltaY)
      const mine = !wheel.ctrlKey && !belongsToNestedScroller(event, horizontal)
      if (mine && event.cancelable) event.preventDefault()
    } else if (event.type === 'touchmove') {
      if (!belongsToNestedScroller(event, true) && event.cancelable) event.preventDefault()
    }
    return false
  }

  /* ---------- Keyboard ---------- */

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
    const target = event.target instanceof HTMLElement ? event.target : null
    const tag = target?.tagName ?? ''
    if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return

    let direction: 1 | -1
    let amount = 80
    switch (event.key) {
      case 'ArrowDown':
        direction = 1
        break
      case 'ArrowUp':
        direction = -1
        break
      case 'PageDown':
      case 'PageUp':
        direction = event.key === 'PageDown' ? 1 : -1
        amount = window.innerHeight * 0.85
        break
      case ' ':
        if (tag === 'BUTTON') return // space presses the button
        direction = event.shiftKey ? -1 : 1
        amount = window.innerHeight * 0.85
        break
      case 'Home':
      case 'End': {
        event.preventDefault()
        const stop = event.key === 'Home' ? stops[0] : stops[stops.length - 1]
        if (ready && !gliding && !locked && stop) glide(stop)
        return
      }
      default:
        return
    }

    event.preventDefault()
    if (!ready || gliding || locked || event.repeat) return
    if (!step(direction)) {
      const range = freeRangeAt(lenis.targetScroll)
      if (range) {
        lenis.scrollTo(clamp(range.from, range.to, lenis.targetScroll + direction * amount), {
          duration: 0.5,
          force: true,
        })
      }
    }
  }
  window.addEventListener('keydown', onKeyDown)

  /* ---------- Links, focus, and scrolling that did not come from here ---------- */

  // in-page links (#about, #contact, ...) glide to the same stops
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return
    const link = (event.target as Element | null)?.closest?.('a[href^="#"]')
    const id = link?.getAttribute('href')?.slice(1)
    if (!id) return
    if (!document.getElementById(id)) return
    event.preventDefault()
    goTo(id)
  }
  document.addEventListener('click', onClick)

  const sectionAt = (y: number) => {
    const before = stops.filter((stop) => stop.y <= y + EPS)
    return (before[before.length - 1] ?? stops[0])?.el ?? null
  }

  // keyboard focus moving into another section brings that section to its stop
  const onFocusIn = (event: FocusEvent) => {
    if (!ready || gliding || locked) return
    const section = (event.target as Element | null)?.closest?.('[data-snap]')
    if (!section || section === sectionAt(lenis.scroll)) return
    const stop = stops.find((candidate) => candidate.el === section)
    if (stop) glide(stop, 0.7)
  }
  root.addEventListener('focusin', onFocusIn)

  // scrollbar drags and the like: once they stop, settle on the nearest stop
  const settle = gsap
    .delayedCall(0.3, () => {
      if (!ready || gliding || locked) return
      const position = lenis.scroll
      const range = freeRangeAt(position)
      if (range && position > range.from && position < range.to) return
      const nearest = nearestStop(position)
      if (Math.abs(nearest.y - position) > EPS) glide(nearest, 0.7)
    })
    .pause()
  const onScroll = () => {
    if (lenis.isScrolling === 'native') settle.restart(true)
  }
  lenis.on('scroll', onScroll)

  /* ---------- Public ---------- */

  const goTo = (id: string) => {
    if (!ready || locked) return false
    const stop = findStop(id)
    if (!stop) return false
    if (!gliding) glide(stop)
    return true
  }

  const currentId = () => {
    if (!stops.length) return null
    return lastId ?? nearestStop(lenis.scroll).id
  }

  /* ---------- Measuring ---------- */

  // Positions are re-measured whenever ScrollTrigger refreshes (resize, late
  // images, fonts), and the page is put back on the stop it was on.
  const onRefresh = () => {
    compute()
    if (!ready || gliding || !stops.length) return
    const position = lenis.scroll
    const range = freeRangeAt(position)
    if (range && position > range.from && position < range.to) return
    const stop = (lastId && findStop(lastId)) || nearestStop(position)
    if (Math.abs(stop.y - position) > 0.5) lenis.scrollTo(stop.y, { immediate: true, force: true })
  }
  ScrollTrigger.addEventListener('refresh', onRefresh)

  // The first snap waits for fonts and the images above the fold, then for one
  // exact measurement. Input before that is swallowed, not queued.
  const eager = Array.from(document.images).filter((img) => img.loading !== 'lazy')
  const settled = Promise.all([
    document.fonts.ready,
    ...eager.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true })
            img.addEventListener('error', () => resolve(), { once: true })
          }),
    ),
  ])
  const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, 2500))

  Promise.race([settled, timeout]).then(() => {
    if (!alive) return
    ScrollTrigger.refresh() // runs compute() through onRefresh
    if (stops.length) {
      ready = true
      const start = (initialId && findStop(initialId)) || null
      const range = freeRangeAt(lenis.scroll)
      if (start) jump(start)
      else if (!range) jump(nearestStop(lenis.scroll))
    }
    onReady?.()
  })

  compute()

  const api: SnapController = {
    gate,
    goTo,
    currentId,
    isTall,
    setLocked(value) {
      locked = value
    },
    destroy() {
      alive = false
      release()
      settle.kill()
      observer.kill()
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('click', onClick)
      root.removeEventListener('focusin', onFocusIn)
      lenis.off('scroll', onScroll)
      ScrollTrigger.removeEventListener('refresh', onRefresh)
      if (controller === api) controller = null
    },
  }
  controller = api
  return api
}

/** The live controller, or null when the page is not snapping. */
export const getSnap = () => controller
