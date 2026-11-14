import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createSnap, getSnap, snapWanted, type SnapController } from '../scroll/snap'

gsap.registerPlugin(ScrollTrigger)

/** The page's single Lenis instance. Null under reduced motion (native scrolling). */
let lenis: Lenis | null = null

/**
 * Where the home page was when it was last left for another route: the snap
 * stop it was on (when snapping), and the plain scroll position (used when
 * the page scrolls freely: phones, reduced motion).
 */
let leftAt: string | null = null
let leftY: number | null = null
let leftSection: string | null = null

/** The next visit to the home page opens there. Cleared once that visit has started. */
export const getLeftAt = () => leftAt
export const getLeftY = () => leftY

/** The section the viewport is mostly showing (used when the page is not snapping). */
function sectionInView(root: HTMLElement) {
  const line = window.innerHeight * 0.4
  const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-snap][id]'))
  const current = sections.filter((el) => el.getBoundingClientRect().top <= line).pop()
  return current?.id ?? null
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/**
 * Freezes or releases the home page's scrolling: Lenis stops and the snap
 * controller swallows input. Page transitions hold this while they run.
 */
export function setScrollLocked(locked: boolean) {
  if (locked) lenis?.stop()
  else lenis?.start()
  getSnap()?.setLocked(locked)
}

/**
 * Programmatic scrolling for sections (project jumps). Uses the snap stop when
 * the page is snapping; otherwise glides to `fallbackY` with Lenis, or jumps
 * there when Lenis is off.
 */
export function goToStop(id: string, fallbackY: number) {
  if (getSnap()?.goTo(id)) return
  if (getSnap()) return // snapping, but not ready or mid-glide: ignore like any other input
  if (lenis) lenis.scrollTo(fallbackY, { duration: 1.1, easing: easeInOut })
  else window.scrollTo({ top: fallbackY })
}

/**
 * Scrolling for the home page. Three modes:
 *   - desktop / tablet: Lenis + section snapping (see scroll/snap.ts)
 *   - touch devices below 900px: Lenis without snapping (normal smooth scroll)
 *   - reduced motion: neither; the browser scrolls natively
 *
 * `root` is the element holding the [data-snap] sections. `startAt` is a stop
 * to open on and `startY` a scroll position (both used when coming back from
 * another page; the position wins where the page scrolls freely). `onReady` is
 * called once the page is measured and sitting at its opening position.
 *
 * Also re-measures every ScrollTrigger once fonts and (lazy) images arrive, so
 * no section needs its own refresh logic.
 */
export function useSmoothScroll(
  root: RefObject<HTMLElement | null>,
  startAt: string | null,
  startY: number | null,
  onReady?: () => void,
) {
  const onReadyRef = useRef(onReady)
  useEffect(() => {
    onReadyRef.current = onReady
  })

  // Noted in a layout effect's cleanup: that runs while the page is still in
  // the document and before the next page resets the scroll position.
  useLayoutEffect(() => {
    const rootEl = root.current
    return () => {
      leftY = window.scrollY
      leftSection = rootEl ? sectionInView(rootEl) : null
    }
  }, [root])

  useEffect(() => {
    const rootEl = root.current
    if (!rootEl) return
    const ready = () => onReadyRef.current?.()

    // positions are restored here, from `startAt`; ScrollTrigger must not
    // replay the ones it remembers from an earlier visit
    ScrollTrigger.clearScrollMemory('manual')
    // this visit has its starting point (startAt, startY); forget the old one
    leftAt = null
    leftY = null

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // native scrolling; still open on the right section and remember it on leaving
      if (startY !== null) window.scrollTo(0, startY)
      else if (startAt) document.getElementById(startAt.split(':')[0])?.scrollIntoView()
      ready()
      return () => {
        leftAt = leftSection
      }
    }

    let snap: SnapController | null = null

    const instance = new Lenis({
      // while snapping, the snap controller decides every movement
      virtualScroll: (data) => (snap ? snap.gate(data) : true),
    })
    lenis = instance

    const onScroll = () => ScrollTrigger.update()
    instance.on('scroll', onScroll)

    const raf = (time: number) => instance.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    // snapping can switch on or off when a touch device crosses 900px (rotation)
    let opened = false
    const syncSnap = () => {
      const wanted = snapWanted()
      if (wanted === Boolean(snap)) return
      snap?.destroy()
      snap = wanted
        ? createSnap(instance, rootEl, opened ? null : startAt, opened ? undefined : ready)
        : null
      opened = true
    }
    syncSnap()
    const narrow = window.matchMedia('(max-width: 899.98px)')
    narrow.addEventListener('change', syncSnap)

    // Without snapping, in-page links still glide the same way. (With it, the
    // controller handles them and lands on the exact stop.)
    const onClick = (event: MouseEvent) => {
      if (snap || event.defaultPrevented || event.button !== 0) return
      const link = (event.target as Element | null)?.closest?.('a[href^="#"]')
      const target = link && document.getElementById(link.getAttribute('href')!.slice(1))
      if (!target) return
      event.preventDefault()
      instance.scrollTo(target, { duration: 1.1, easing: easeInOut })
    }
    document.addEventListener('click', onClick)

    // opening on a section without snapping: go straight there once laid out
    if (!snap) {
      const target = startAt && document.getElementById(startAt.split(':')[0])
      if (startY !== null) instance.scrollTo(startY, { immediate: true })
      else if (target) instance.scrollTo(target, { immediate: true })
      ready()
    }

    return () => {
      leftAt = snap?.currentId() ?? leftSection
      narrow.removeEventListener('change', syncSnap)
      document.removeEventListener('click', onClick)
      snap?.destroy()
      gsap.ticker.remove(raf)
      instance.off('scroll', onScroll)
      instance.destroy()
      lenis = null
    }
  }, [root, startAt, startY])

  useEffect(() => {
    let alive = true
    const refresh = gsap.delayedCall(0.2, () => ScrollTrigger.refresh()).pause()
    const queue = () => {
      if (alive) refresh.restart(true)
    }

    // image load events don't bubble, so listen in the capture phase
    const onLoad = (e: Event) => {
      if (e.target instanceof HTMLImageElement) queue()
    }
    document.addEventListener('load', onLoad, true)
    document.fonts.ready.then(queue)

    return () => {
      alive = false
      refresh.kill()
      document.removeEventListener('load', onLoad, true)
    }
  }, [])
}
