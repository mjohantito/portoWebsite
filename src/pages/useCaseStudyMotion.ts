import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { arrivalDelay, isTransitioning } from '../transition/transition'

gsap.registerPlugin(ScrollTrigger, SplitText)

const format = (n: number) => Math.round(n).toLocaleString('en-US')

/**
 * Case-study page motion, in the site's usual pattern: everything lives in a
 * gsap.matchMedia() scoped to `prefers-reduced-motion: no-preference`, so with
 * reduced motion nothing runs and the markup's final state shows (final
 * numbers included). Reverting the context on unmount kills every tween and
 * ScrollTrigger made here.
 *
 *   hero      title lines rise from behind a mask; after a page transition this
 *             waits for the transition's cover to start clearing
 *   reveals   [data-cs-reveal] blocks rise and fade in as they scroll into view
 *   numbers   count up from 0 once in view
 *   journey   the timeline's line draws with scroll; each step lights up
 */
export function useCaseStudyMotion(
  scope: RefObject<HTMLElement | null>,
  heading: RefObject<HTMLHeadingElement | null>,
) {
  useLayoutEffect(() => {
    const root = scope.current
    const title = heading.current
    if (!root || !title) return

    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(root)
      const arriving = isTransitioning()
      const delay = arrivalDelay()

      /* ---------- Hero ---------- */
      let first = true
      const split = SplitText.create(title, {
        type: 'lines',
        mask: 'lines',
        autoSplit: true,
        onSplit: (self) => {
          const tween = gsap.from(self.lines, {
            yPercent: 110,
            duration: 1.1,
            ease: 'expo.out',
            stagger: 0.09,
            delay: first ? delay + 0.1 : 0,
          })
          first = false
          return tween
        },
      })
      gsap.from(q('[data-cs-rise]'), {
        yPercent: 115,
        duration: 0.9,
        ease: 'expo.out',
        delay: delay + 0.25,
      })
      gsap.from(q('[data-cs-hero-fade]'), {
        y: 18,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.1,
        delay: delay + 0.45,
      })
      gsap.from(q('.cs__bar'), { opacity: 0, duration: 0.8, delay: delay + 0.5 })
      // a page transition hands over on the bare photo; a direct load fades it in
      gsap.from(q('[data-cs-hero-shade]'), { opacity: 0, duration: 1, ease: 'power1.out', delay })
      if (!arriving) {
        gsap.from(q('[data-cs-hero-img]'), {
          opacity: 0,
          scale: 1.06,
          duration: 1.4,
          ease: 'power2.out',
        })
      }

      /* ---------- Scroll reveals ---------- */
      const blocks = q('[data-cs-reveal]')
      gsap.set(blocks, { opacity: 0, y: 28 })
      ScrollTrigger.batch(blocks, {
        start: 'top 88%',
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: 'power3.out',
            stagger: 0.08,
            overwrite: true,
          }),
      })

      /* ---------- Count-up ---------- */
      q('[data-cs-count]').forEach((el) => {
        const target = Number(el.getAttribute('data-cs-count'))
        const counter = { value: 0 }
        el.textContent = format(0)
        gsap.to(counter, {
          value: target,
          duration: target > 100 ? 1.8 : 1.2,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          onUpdate: () => {
            el.textContent = format(counter.value)
          },
          onComplete: () => {
            el.textContent = format(target)
          },
        })
      })

      /* ---------- Journey: the line follows the scroll ---------- */
      const timeline = q('[data-cs-timeline]')[0]
      if (timeline) {
        gsap.fromTo(
          q('[data-cs-line]'),
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            scrollTrigger: { trigger: timeline, start: 'top 70%', end: 'bottom 70%', scrub: 0.6 },
          },
        )
        q('[data-cs-step]').forEach((step) => {
          ScrollTrigger.create({
            trigger: step,
            start: 'top 70%',
            onEnter: () => step.classList.add('is-lit'),
            onLeaveBack: () => step.classList.remove('is-lit'),
          })
        })
      }

      return () => {
        split.revert()
        q('[data-cs-step]').forEach((step) => step.classList.remove('is-lit'))
        q('[data-cs-count]').forEach((el) => {
          el.textContent = format(Number(el.getAttribute('data-cs-count')))
        })
      }
    })

    return () => mm.revert()
  }, [scope, heading])
}
