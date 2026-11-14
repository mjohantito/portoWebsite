import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { registerEntrance } from '../../scroll/snap'
import { createEmbers } from './embers'

gsap.registerPlugin(ScrollTrigger)

/**
 * My business motion: the entrance, and keeping the ambient loops (background
 * and main-photo drift, embers) running only while the section is on screen
 * and the tab is visible.
 *
 * The carousel itself is not animated from here: it is a CSS transform driven
 * by React state, so it also works (instantly) with reduced motion, where none
 * of this runs.
 */
export function useBusinessMotion(scope: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = scope.current
    if (!root) return

    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(root)

      /* ---------- Entrance: background up, cards rise, contents stagger ---------- */
      const intro = gsap
        .timeline({ paused: true })
        .fromTo(
          q('[data-biz-bg]'),
          { opacity: 0 },
          { opacity: 1, duration: 1.3, ease: 'power1.out' },
          0,
        )
        // the cards themselves, not their slides: slides have a CSS opacity
        // transition (off-centre dimming) that would drag behind a tween
        .fromTo(
          q('[data-biz-card]'),
          { y: 44, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.95, ease: 'expo.out', stagger: 0.08 },
          0.1,
        )
        .fromTo(
          q('[data-biz-fade]'),
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.055 },
          0.3,
        )
        // photos: unmasked from the top one after another, settling from a slow scale
        .fromTo(
          q('[data-biz-photo]'),
          { clipPath: 'inset(0% 0% 100% 0% round 12px)' },
          {
            clipPath: 'inset(0% 0% 0% 0% round 12px)',
            duration: 0.9,
            ease: 'expo.inOut',
            stagger: 0.12,
            clearProps: 'clipPath',
          },
          0.25,
        )
        .fromTo(
          q('[data-biz-photo-zoom]'),
          { scale: 1.08 },
          { scale: 1, duration: 2.2, ease: 'power2.out', stagger: 0.12 },
          0.25,
        )
        .fromTo(
          q('[data-biz-controls], [data-biz-embers]'),
          { opacity: 0 },
          { opacity: 1, duration: 0.8, ease: 'power1.out' },
          0.7,
        )

      registerEntrance(
        root,
        { play: () => intro.play(), finish: () => intro.progress(1) },
        'top 62%',
      )

      /* ---------- Ambient loops only run while visible ---------- */
      const embers = createEmbers(q('[data-biz-embers]')[0] as HTMLCanvasElement, 14, 0.55)
      let inView = false
      const sync = () => {
        const live = inView && !document.hidden
        root.dataset.live = String(live)
        if (live) embers.start()
        else embers.stop()
      }
      document.addEventListener('visibilitychange', sync)

      ScrollTrigger.create({
        trigger: root,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => {
          inView = self.isActive
          sync()
        },
      })
      sync()

      return () => {
        document.removeEventListener('visibilitychange', sync)
        embers.destroy()
        delete root.dataset.live
      }
    })

    return () => mm.revert()
  }, [scope])
}
