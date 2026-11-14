import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { goToStop } from '../../hooks/useSmoothScroll'
import { registerEntrance, setSectionStops } from '../../scroll/snap'

gsap.registerPlugin(ScrollTrigger)

/** State the section component renders from; the script only reports changes. */
interface WorkCallbacks {
  setActive: (index: number) => void
  setEntered: (entered: boolean) => void
  setPinned: (pinned: boolean) => void
  setLive: (live: boolean) => void
}

const PEEK_SCALE = 0.28 // size of the previous / next image relative to the active one
const PEEK_DIM = 0.5
const GLOW = 0.45 // ambient glow behind the active image...
const GLOW_PEEK = 0.16 // ...and behind a peeking one (which is itself dimmed)

/**
 * Selected work motion. Two modes, matching the layouts in Work.css:
 *
 *   pinned (>= 900px)  The section is pinned for one viewport of scroll per
 *                      step between slots, and scroll scrubs a single number,
 *                      `pos` (0 to count - 1). Everything in the carousel is
 *                      drawn from it; the active slot is simply round(pos).
 *                      Each slot is a stop for the page's snap controller, so
 *                      one gesture moves exactly one slot and the gesture
 *                      after the last one leaves the section.
 *   list (< 900px)     No pinning. Each image is revealed as it scrolls in.
 *
 * `count` is the number of slots (the visible projects plus the coming-soon
 * slot); the pin length and the stops follow it.
 *
 * With reduced motion neither mode runs. Returns go(index), which glides to
 * a slot in pinned mode.
 */
export function useWorkMotion(
  scope: RefObject<HTMLElement | null>,
  count: number,
  callbacks: WorkCallbacks,
) {
  const callbacksRef = useRef(callbacks)
  const goRef = useRef<(index: number) => void>(() => {})

  useLayoutEffect(() => {
    callbacksRef.current = callbacks
  })

  useLayoutEffect(() => {
    const root = scope.current
    if (!root) return

    const mm = gsap.matchMedia()
    const report = callbacksRef

    mm.add(
      {
        pinned: '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
        list: '(max-width: 899.98px) and (prefers-reduced-motion: no-preference)',
      },
      (context) => {
        const q = gsap.utils.selector(root)
        const items = q('[data-work-item]')

        /* ================= list: reveal each project as it scrolls in ================= */
        if (context.conditions?.list) {
          items.forEach((item) => {
            const find = (selector: string) => item.querySelectorAll(selector)
            gsap
              .timeline({ scrollTrigger: { trigger: item, start: 'top 82%', once: true } })
              // the image is unmasked from the top while it settles from a slow scale
              .fromTo(
                find('.work__frame'),
                { clipPath: 'inset(0% 0% 100% 0% round 12px)' },
                {
                  clipPath: 'inset(0% 0% 0% 0% round 12px)',
                  duration: 1.3,
                  ease: 'expo.inOut',
                  clearProps: 'clipPath',
                },
                0,
              )
              .fromTo(
                find('[data-work-zoom]'),
                { scale: 1.18 },
                { scale: 1, duration: 2.4, ease: 'power2.out' },
                0,
              )
              .from(find('[data-work-glow]'), { opacity: 0, duration: 1.6, ease: 'power1.out' }, 0.4)
              .fromTo(
                find('.work__head > *, .work__facts'),
                { opacity: 0, y: 16 },
                { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.09 },
                0.7,
              )
          })
          return
        }

        if (!context.conditions?.pinned) return

        /* ================= pinned: panels + focus carousel ================= */
        const pin = q('[data-work-pin]')[0]
        const stage = q('[data-work-stage]')[0] as HTMLElement
        const slots = q('[data-work-slot]') as HTMLElement[]
        const drifts = q('[data-work-drift]')
        const zooms = q('[data-work-zoom]')
        const glows = q('[data-work-glow]')
        const lines = q('[data-work-line]')
        const indexButtons = q('[data-work-index]')
        const linesBox = q('[data-work-lines]')[0]

        const state = { pos: 0, breath: 1 }
        let active = -1
        let entered = false
        // slots differ in shape (landscape, portrait), so each has its own height
        let heights: number[] = []
        let stageH = 0

        report.current.setPinned(true)

        /* ---------- Carousel: every slot placed from `pos` ---------- */
        const lerp = gsap.utils.interpolate
        const render = () => {
          slots.forEach((slot, i) => {
            const d = i - state.pos // -1 = previous, 0 = active, 1 = next
            const distance = Math.abs(d)
            const near = Math.min(distance, 1)
            // beyond the neighbours: keep going, out of the panel, and fade
            const beyond = Math.max(distance - 1, 0)

            // a neighbour peeks in at the panel's top or bottom edge, slightly cut off
            const peek = stageH / 2 - heights[i] * PEEK_SCALE * 0.4
            gsap.set(slot, {
              y: Math.sign(d) * (near * peek + beyond * heights[i] * PEEK_SCALE * 1.5),
              scale: lerp(1, PEEK_SCALE, near),
              opacity: Math.max(lerp(1, PEEK_DIM, near) - beyond * 1.4, 0),
            })
            // slight parallax of the image inside its frame
            gsap.set(drifts[i], { yPercent: gsap.utils.clamp(-1, 1, d) * 4 })
            // glow: strong behind the active image, faint behind the peeks. Its
            // slow "breathing" is opacity and scale only.
            gsap.set(glows[i], {
              opacity: lerp(GLOW, GLOW_PEEK, near) * state.breath,
              scale: 1 + (1 - state.breath) * 0.3,
            })
          })
        }

        const breathing = gsap.to(state, {
          breath: 0.76,
          duration: 4.8,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          paused: true,
          onUpdate: render,
        })

        /* ---------- Lines from each index number to the active title ---------- */
        const drawLines = (animate: boolean) => {
          const title = items[Math.max(active, 0)].querySelector('.work__title')
          if (!title) return
          const box = linesBox.getBoundingClientRect()
          const target = title.getBoundingClientRect()
          const endX = target.left - box.left - 14
          const endY = target.top - box.top + target.height / 2

          lines.forEach((line, i) => {
            const from = indexButtons[i].getBoundingClientRect()
            const startX = from.right - box.left + 4
            const startY = from.top - box.top + from.height / 2
            const reach = endX - startX
            line.setAttribute(
              'd',
              `M${startX} ${startY} C${startX + reach * 0.55} ${startY} ${endX - reach * 0.5} ${endY} ${endX} ${endY}`,
            )
          })

          if (animate) {
            gsap.fromTo(
              lines,
              { strokeDashoffset: 1 },
              {
                strokeDashoffset: 0,
                duration: 0.9,
                ease: 'power2.out',
                stagger: 0.05,
                overwrite: true,
              },
            )
          }
        }

        /* ---------- Active project ---------- */
        const activate = (index: number) => {
          if (index === active) return
          active = index
          report.current.setActive(index)
          if (!entered) return
          drawLines(true)
          // the new image eases out of a very slow zoom
          gsap.fromTo(
            zooms[index],
            { scale: 1.08 },
            { scale: 1, duration: 3.2, ease: 'power2.out', overwrite: true },
          )
        }

        const measure = () => {
          heights = slots.map((slot) => slot.offsetHeight)
          stageH = stage.clientHeight
          render()
          // a refresh can move the timeline without firing its callbacks (for
          // example when the page reopens on a later project), so sync here too
          activate(Math.round(state.pos))
          drawLines(false)
        }

        /* ---------- Pin + scrub ----------
           One viewport of scroll per step, so slot i sits exactly at progress
           i / (count - 1): the first at the pin's start (section top at the
           top of the screen), the last at its end. With a single slot there
           are no steps (the pin is one pixel long, just enough to exist). */
        const steps = Math.max(count - 1, 1)
        const timeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: root,
            pin,
            start: 'top top',
            end: () => `+=${Math.max((count - 1) * window.innerHeight, 1)}`,
            scrub: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onRefresh: measure,
          },
        })
        timeline.to(state, {
          pos: count - 1,
          onUpdate: () => {
            render()
            activate(Math.round(state.pos))
          },
        })

        const trigger = timeline.scrollTrigger as ScrollTrigger
        const scrollFor = (index: number) =>
          trigger.start + (Math.min(index, count - 1) / steps) * (trigger.end - trigger.start)

        // every slot is a snap stop: "work:0", "work:1", ...
        const removeStops = setSectionStops(root, () =>
          Array.from({ length: count }, (_, index) => scrollFor(index)),
        )
        goRef.current = (index) => goToStop(`${root.id}:${index}`, scrollFor(index))

        /* ---------- Image cycling and the glow's breathing: only while on screen ----------
           Its own trigger, not the pin's: a pin does not count as active at
           its very start or end, which is exactly where the first and last
           slots rest. */
        let inView = false
        const syncLive = () => {
          const live = inView && !document.hidden
          report.current.setLive(live)
          breathing.paused(!live)
        }
        ScrollTrigger.create({
          trigger: root,
          start: 'top 60%',
          end: 'bottom 40%',
          onToggle: (self) => {
            inView = self.isActive
            syncLive()
          },
        })
        document.addEventListener('visibilitychange', syncLive)

        /* ---------- Entry: panels rise, borders draw, then the first project ---------- */
        const entry = gsap
          .timeline({ paused: true })
          .fromTo(
            q('[data-work-panel]'),
            { y: 80, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.1 },
            0,
          )
          .fromTo(
            q('[data-work-border]'),
            { strokeDashoffset: 1 },
            { strokeDashoffset: 0, duration: 1, ease: 'power2.inOut', stagger: 0.1 },
            0.15,
          )
          .add(() => {
            entered = true
            report.current.setEntered(true)
            drawLines(true)
          }, 0.5)
        registerEntrance(
          root,
          { play: () => entry.play(), finish: () => entry.progress(1) },
          'top 72%',
        )

        measure()

        // Reverting the context removes the pin and every tween made above. Left
        // to undo by hand: what callbacks set later, and what React was told.
        return () => {
          removeStops()
          document.removeEventListener('visibilitychange', syncLive)
          goRef.current = () => {}
          gsap.killTweensOf([...zooms, ...lines])
          gsap.set([...slots, ...drifts, ...zooms, ...glows, ...lines], { clearProps: 'all' })
          report.current.setPinned(false)
          report.current.setEntered(false)
          report.current.setLive(false)
          report.current.setActive(0)
        }
      },
    )

    return () => mm.revert()
  }, [scope, count])

  return useCallback((index: number) => goRef.current(index), [])
}
