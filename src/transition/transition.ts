import gsap from 'gsap'
import type { NavigateFunction } from 'react-router-dom'
import type { Photo } from '../data/photos'
import { setScrollLocked } from '../hooks/useSmoothScroll'
import { completeEntrances } from '../scroll/snap'
import { HOME, cleanPath, transitionFor } from './routes'
import './transition.css'

/*
 * Page transitions between the home page and the other routes.
 *
 * Every transition has the same three steps:
 *   1. cover    something grows or slides until it hides the screen
 *   2. switch   the route changes underneath, and we wait for the new page to
 *               say it is ready (pageReady)
 *   3. reveal   the cover leaves while the new page's own entrance plays
 *
 * What the cover is depends on the page (see routes.ts):
 *   zoom   a copy of the business's main photo grows from its place in the
 *          card to the full screen; going back, it shrinks onto the card again
 *   wipe   a dark panel slides over the screen, and on off the other side
 *   fade   reduced motion: a quick crossfade through the page colour
 *
 * Links start a transition with startTransition (see TransitionLink). The
 * browser's back button changes the route by itself, so there the cover is put
 * in place instantly and only step 3 plays (onRouteChange).
 *
 * Only one transition runs at a time. While it does, scrolling, keys and
 * clicks are swallowed. Whatever happens (an interruption, a page that never
 * reports ready), finish() removes the cover and every listener; a watchdog
 * calls it if nothing else does.
 */

const ZOOM = 0.85 // seconds: photo to full screen, and back
const WIPE = 0.6 // seconds: the panel crossing the screen, each way
const READY_TIMEOUT = 4000 // ms to wait for a page before revealing it anyway
const WATCHDOG = 9 // seconds after which a transition is cleared no matter what

type Plan =
  | { kind: 'zoom'; back: boolean; key: string; photo: Photo }
  | { kind: 'wipe'; back: boolean }
  | { kind: 'fade' }

interface Clone {
  wrap: HTMLDivElement
  img: HTMLImageElement
  /** the picture's size when it covers the screen */
  width: number
  ratio: number
  vw: number
  vh: number
}

interface Run {
  plan: Plan
  layer: HTMLDivElement
  context: gsap.Context
  /** the path our own navigate() is about to produce */
  expecting: string | null
  clone: Clone | null
  cover: HTMLElement | null
  /** resolvers of everything this run is waiting on */
  waiting: Set<() => void>
  cleanups: Array<() => void>
  watchdog: gsap.core.Tween
  dead: boolean
}

let run: Run | null = null
let routeChanges = 0

/* ==========================================================================
   Pages report when they are ready to be shown
   ========================================================================== */

let readyPath: string | null = null
const readyListeners = new Set<(path: string) => void>()

/** Called by a page once it is laid out and (for the home page) scrolled into place. */
export function pageReady(pathname: string) {
  readyPath = cleanPath(pathname)
  readyListeners.forEach((listener) => listener(readyPath as string))
}

/** Called by a page as it unmounts. */
export function pageGone(pathname: string) {
  if (readyPath === cleanPath(pathname)) readyPath = null
}

/** True from the second page on: the visitor has moved between routes. */
export const hasChangedRoute = () => routeChanges > 0

export const isTransitioning = () => run !== null

/**
 * How long a page arriving through a transition should hold its entrance, so
 * it plays as the cover clears and not underneath it. Zero on a direct load.
 */
export function arrivalDelay() {
  if (!run) return 0
  return run.plan.kind === 'zoom' ? 0.15 : run.plan.kind === 'wipe' ? WIPE * 0.45 : 0
}

/* ==========================================================================
   Waiting, in a way that an aborted transition can always get out of
   ========================================================================== */

function until(r: Run, start: (done: () => void) => void | (() => void)) {
  return new Promise<void>((resolve) => {
    if (r.dead) return resolve()
    let stop: void | (() => void)
    const done = () => {
      r.waiting.delete(done)
      stop?.()
      resolve()
    }
    r.waiting.add(done)
    stop = start(done)
  })
}

const played = (r: Run, build: () => gsap.core.Animation) =>
  until(r, (done) => {
    r.context.add(() => build().eventCallback('onComplete', done))
  })

const pageIsReady = (r: Run, pathname: string) =>
  until(r, (done) => {
    if (readyPath === pathname) return done()
    const listener = (path: string) => path === pathname && done()
    readyListeners.add(listener)
    const id = window.setTimeout(done, READY_TIMEOUT)
    return () => {
      readyListeners.delete(listener)
      window.clearTimeout(id)
    }
  })

/** Resolves once an image can be painted (or after `ms`, whichever is first). */
const decoded = (r: Run, image: HTMLImageElement | null | undefined, ms: number) =>
  until(r, (done) => {
    if (!image) return done()
    image.decode().then(done, done)
    const id = window.setTimeout(done, ms)
    return () => window.clearTimeout(id)
  })

/* ==========================================================================
   Start and finish
   ========================================================================== */

const SCROLL_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' ',
  'Enter',
])

function swallow(event: Event) {
  if (event instanceof KeyboardEvent && !SCROLL_KEYS.has(event.key)) return
  if (event.cancelable) event.preventDefault()
  event.stopPropagation()
}

const GUARDED = ['wheel', 'touchmove', 'keydown', 'click', 'auxclick'] as const

function begin(plan: Plan): Run {
  const layer = document.createElement('div')
  layer.className = 'route-layer'
  layer.setAttribute('aria-hidden', 'true')
  document.body.append(layer)

  // capture phase, on window: nothing else on the page hears these
  GUARDED.forEach((type) => window.addEventListener(type, swallow, { capture: true, passive: false }))

  const r: Run = {
    plan,
    layer,
    context: gsap.context(() => {}),
    expecting: null,
    clone: null,
    cover: null,
    waiting: new Set(),
    cleanups: [],
    watchdog: gsap.delayedCall(WATCHDOG, () => finish(r)),
    dead: false,
  }
  run = r
  document.documentElement.dataset.routeTransition = ''
  setScrollLocked(true)
  return r
}

function finish(r: Run) {
  if (r.dead) return
  r.dead = true
  r.watchdog.kill()
  r.cleanups.forEach((cleanup) => cleanup())
  r.context.revert() // kills its tweens and takes their inline styles off the page
  r.layer.remove()
  GUARDED.forEach((type) => window.removeEventListener(type, swallow, { capture: true }))
  if (run === r) run = null
  delete document.documentElement.dataset.routeTransition
  setScrollLocked(false)
  // let go of anything still waiting on this run
  ;[...r.waiting].forEach((done) => done())
}

/** Stops the current transition, wherever it is, and clears the screen. */
export function abortTransition() {
  if (run) finish(run)
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function planFor(from: string, to: string): Plan {
  if (reducedMotion()) return { kind: 'fade' }
  const back = to === HOME && from !== HOME
  // the transition belongs to the page that is not the home page
  const route = transitionFor(back ? from : to)
  if (route.variant === 'zoom') return { kind: 'zoom', back, key: route.key, photo: route.photo }
  return { kind: 'wipe', back }
}

/* ==========================================================================
   Zoom: a copy of the shared photo, placed with a clip and a transform
   ========================================================================== */

const sharedFigure = (key: string) => document.querySelector<HTMLElement>(`[data-shared="${key}"]`)

/** The picture a shared figure is showing: with several (a cycling card), the one on show. */
const shownImage = (figure: HTMLElement | null | undefined) =>
  figure?.querySelector<HTMLImageElement>('img.is-shown') ??
  figure?.querySelector<HTMLImageElement>('img') ??
  null

const FULL_SCREEN = 'inset(0px 0px 0px 0px round 0px)'

/**
 * A full-screen layer holding the photo at the size at which it covers the
 * screen. It is never resized: a clip-path chooses the window through which it
 * shows, and a transform moves and scales the picture behind that window.
 */
function makeClone(r: Run, photo: Photo, shown: HTMLImageElement | null): Clone {
  const wrap = document.createElement('div')
  wrap.className = 'route-layer__photo'
  const img = document.createElement('img')
  img.alt = ''
  img.decoding = 'sync'
  const src = shown?.currentSrc
  if (src) {
    img.src = src // the file the page is already showing
  } else {
    img.sizes = '100vw'
    img.srcset = photo.srcSet
    img.src = photo.src
  }

  const vw = window.innerWidth
  const vh = window.innerHeight
  // the shape of the picture actually on show (a card that cycles may be on
  // another photo than the one the next page opens with)
  const ratio =
    shown?.naturalWidth && shown.naturalHeight
      ? shown.naturalWidth / shown.naturalHeight
      : photo.width / photo.height
  const width = Math.max(vw, vh * ratio)
  const height = width / ratio
  Object.assign(img.style, {
    width: `${width}px`,
    height: `${height}px`,
    margin: `${-height / 2}px 0 0 ${-width / 2}px`,
  })

  wrap.append(img)
  r.layer.append(wrap)
  const clone = { wrap, img, width, ratio, vw, vh }
  r.clone = clone
  return clone
}

/** Whether a photo's frame is somewhere a visitor can see it. */
function inView(frame: DOMRect) {
  const margin = 40
  return (
    frame.width > margin &&
    frame.height > margin &&
    frame.bottom > margin &&
    frame.right > margin &&
    frame.top < window.innerHeight - margin &&
    frame.left < window.innerWidth - margin
  )
}

/**
 * Where the shared photo sits on the page right now: the clip for its frame,
 * and the transform that puts the clone's picture exactly over the page's.
 */
function placeOver(figure: HTMLElement, clone: Clone) {
  const frame = figure.getBoundingClientRect()
  // the picture is drawn to cover its <img> box, which may be larger than the
  // frame (it drifts and scales slightly inside it)
  const box = (shownImage(figure) ?? figure).getBoundingClientRect()
  const pictureWidth = Math.max(box.width, box.height * clone.ratio)
  const radius = parseFloat(getComputedStyle(figure).borderTopLeftRadius) || 0

  return {
    clip: `inset(${frame.top}px ${clone.vw - frame.right}px ${clone.vh - frame.bottom}px ${frame.left}px round ${radius}px)`,
    picture: {
      x: box.left + box.width / 2 - clone.vw / 2,
      y: box.top + box.height / 2 - clone.vh / 2,
      scale: pictureWidth / clone.width,
    },
  }
}

/** Hides the page's own copy of the photo while the clone stands in for it. */
function standInFor(r: Run, figure: HTMLElement) {
  figure.style.visibility = 'hidden'
  const show = () => {
    figure.style.visibility = ''
  }
  r.cleanups.push(show)
  return show
}

/**
 * What gets scaled when a section falls back: its contents, never the section
 * itself. The section's own box is what the scroll system measures, and that
 * can happen at any moment (an image finishing loading triggers it).
 *
 * A section with a pinned (position: fixed) element marks it [data-fall-root]:
 * scaling anything around a fixed element would move it, so its children are
 * scaled instead.
 */
const contentsOf = (section: Element) =>
  Array.from((section.querySelector('[data-fall-root]') ?? section).children)

/* ---------- home -> detail page: the photo grows to fill the screen ---------- */

async function zoomIn(r: Run, plan: Extract<Plan, { kind: 'zoom' }>, origin: HTMLElement | null) {
  const figure = sharedFigure(plan.key)
  if (!figure || !inView(figure.getBoundingClientRect())) {
    // nothing to grow from (the card is off screen): use the panel instead
    r.plan = { kind: 'wipe', back: false }
    return wipeIn(r, false, origin)
  }

  const clone = makeClone(r, plan.photo, shownImage(figure))
  const start = placeOver(figure, clone)
  r.context.add(() => {
    gsap.set(clone.wrap, { clipPath: start.clip })
    gsap.set(clone.img, start.picture)
  })
  await decoded(r, clone.img, 250)
  if (r.dead) return
  standInFor(r, figure)

  // start fetching the size the next page will show full screen
  const warm = new Image()
  warm.sizes = '100vw'
  warm.srcset = plan.photo.srcSet

  const section = figure.closest('[data-snap]') ?? figure
  await played(r, () =>
    gsap
      .timeline({ defaults: { duration: ZOOM, ease: 'power3.inOut' } })
      .to(clone.wrap, { clipPath: FULL_SCREEN }, 0)
      .to(clone.img, { x: 0, y: 0, scale: 1 }, 0)
      // the rest of the page falls back and fades
      .to(section, { opacity: 0, duration: ZOOM * 0.8, ease: 'power2.inOut' }, 0)
      .to(contentsOf(section), { scale: 0.95, duration: ZOOM * 0.8, ease: 'power2.inOut' }, 0),
  )
}

/** On the detail page: its top visual is the same photo, so the clone just dissolves. */
async function zoomInReveal(r: Run, plan: Extract<Plan, { kind: 'zoom' }>) {
  const clone = r.clone
  if (!clone) return
  await decoded(r, shownImage(sharedFigure(plan.key)), 1200)
  if (r.dead) return
  await played(r, () => gsap.to(clone.wrap, { opacity: 0, duration: 0.45, ease: 'power1.out' }))
}

/* ---------- detail page -> home: the photo shrinks back onto the card ---------- */

async function zoomOutCover(r: Run, plan: Extract<Plan, { kind: 'zoom' }>, instant: boolean) {
  const shown = instant ? null : shownImage(sharedFigure(plan.key))
  const clone = makeClone(r, plan.photo, shown)
  r.context.add(() => gsap.set(clone.wrap, { clipPath: FULL_SCREEN }))
  if (instant) {
    // nothing may show through while the picture is being decoded
    clone.wrap.style.background = 'var(--color-bg)'
    return
  }

  r.context.add(() => gsap.set(clone.wrap, { opacity: 0 }))
  await decoded(r, clone.img, 250)
  if (r.dead) return
  // the page's title and shade fade away under the bare photo
  await played(r, () => gsap.to(clone.wrap, { opacity: 1, duration: 0.25, ease: 'power1.out' }))
}

async function zoomOutReveal(r: Run, plan: Extract<Plan, { kind: 'zoom' }>) {
  const clone = r.clone
  if (!clone) return
  const figure = sharedFigure(plan.key)
  const section = figure?.closest('[data-snap]')
  // the card must be standing in its final place to be measured and landed on
  if (section) completeEntrances(section)

  if (!figure || !section || !inView(figure.getBoundingClientRect())) {
    // the card's position cannot be used: a plain step back and fade
    await played(r, () =>
      gsap.to(clone.wrap, { scale: 0.92, opacity: 0, duration: 0.5, ease: 'power2.out' }),
    )
    return
  }

  const end = placeOver(figure, clone)
  const showFigure = standInFor(r, figure)
  await played(r, () =>
    gsap
      .timeline({ defaults: { duration: ZOOM, ease: 'power3.inOut' } })
      .fromTo(section, { opacity: 0 }, { opacity: 1, ease: 'power2.out' }, 0)
      .fromTo(contentsOf(section), { scale: 0.95 }, { scale: 1, ease: 'power2.out' }, 0)
      .to(clone.wrap, { clipPath: end.clip }, 0)
      .to(clone.img, end.picture, 0),
  )
  // hand over to the card's own photo once it can be painted. The two can
  // differ (a page hero that is not the card's photo), so crossfade.
  await decoded(r, shownImage(figure), 800)
  if (r.dead) return
  showFigure()
  await played(r, () => gsap.to(clone.wrap, { opacity: 0, duration: 0.3, ease: 'power1.out' }))
}

/* ==========================================================================
   Wipe: a dark panel crosses the screen
   ========================================================================== */

function makeCover(r: Run, className: string) {
  const cover = document.createElement('div')
  cover.className = className
  r.layer.append(cover)
  r.cover = cover
  return cover
}

/** The clicked button or card swells a little as the panel comes in. */
function lift(r: Run, origin: HTMLElement | null) {
  if (!origin?.animate) return
  // the `scale` property: independent of whatever transform the element has
  const animation = origin.animate([{ scale: '1' }, { scale: '1.04' }], {
    duration: WIPE * 1000,
    easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
    fill: 'forwards',
  })
  r.cleanups.push(() => animation.cancel())
}

// forward: the panel rises from the bottom and leaves through the top;
// going back it comes down from the top and leaves through the bottom
async function wipeIn(r: Run, back: boolean, origin: HTMLElement | null, instant = false) {
  const cover = makeCover(r, 'route-layer__panel')
  if (instant) return
  lift(r, origin)
  await played(r, () =>
    gsap.fromTo(
      cover,
      { yPercent: back ? -100 : 100 },
      { yPercent: 0, duration: WIPE, ease: 'power3.inOut' },
    ),
  )
}

async function wipeOut(r: Run, back: boolean) {
  const cover = r.cover
  if (!cover) return
  await played(r, () =>
    gsap.to(cover, { yPercent: back ? 100 : -100, duration: WIPE, ease: 'power3.inOut' }),
  )
}

/* ==========================================================================
   Fade (reduced motion)
   ========================================================================== */

async function fadeIn(r: Run, instant: boolean) {
  const cover = makeCover(r, 'route-layer__fade')
  if (instant) return
  await played(r, () =>
    gsap.fromTo(cover, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: 'none' }),
  )
}

async function fadeOut(r: Run) {
  const cover = r.cover
  if (!cover) return
  await played(r, () => gsap.to(cover, { opacity: 0, duration: 0.2, ease: 'none' }))
}

/* ==========================================================================
   The three steps
   ========================================================================== */

function cover(r: Run, origin: HTMLElement | null, instant: boolean) {
  const plan = r.plan
  if (plan.kind === 'fade') return fadeIn(r, instant)
  if (plan.kind === 'wipe') return wipeIn(r, plan.back, origin, instant)
  return plan.back ? zoomOutCover(r, plan, instant) : zoomIn(r, plan, origin)
}

async function reveal(r: Run, pathname: string) {
  await pageIsReady(r, pathname)
  if (r.dead) return
  setScrollLocked(true) // the page that just arrived has its own scrolling to hold

  const plan = r.plan // (a zoom with nothing to grow from has become a wipe)
  if (plan.kind === 'fade') return fadeOut(r)
  if (plan.kind === 'wipe') return wipeOut(r, plan.back)
  return plan.back ? zoomOutReveal(r, plan) : zoomInReveal(r, plan)
}

/**
 * Goes to `to` with a transition. `origin` is the link that was clicked.
 * Clicks made while a transition is running are ignored.
 */
export async function startTransition(
  navigate: NavigateFunction,
  to: string,
  state: unknown,
  origin: HTMLElement | null,
) {
  if (run) return
  const from = cleanPath(window.location.pathname)
  const target = cleanPath(to)
  if (target === from) return

  const r = begin(planFor(from, target))
  try {
    await cover(r, origin, false)
    if (r.dead) return
    r.expecting = target
    navigate(to, { state })
    await reveal(r, target)
  } finally {
    finish(r)
  }
}

/**
 * Called on every route change, before the new page is painted.
 *
 * A change we started ourselves is already covered. Any other change during a
 * transition means it was interrupted: clear it. And when the browser's back
 * button returns to the home page, cover the screen at once and play the way
 * back from there.
 */
export function onRouteChange(fromPath: string, toPath: string, byHistory: boolean) {
  const from = cleanPath(fromPath)
  const to = cleanPath(toPath)
  routeChanges += 1

  if (run) {
    if (run.expecting === to) {
      run.expecting = null
      return
    }
    abortTransition()
    return
  }

  if (!byHistory || to !== HOME || from === HOME) return
  const r = begin(planFor(from, to))
  cover(r, null, true)
  reveal(r, to).finally(() => finish(r))
}
