import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Words rest at 20% opacity and light up one by one as the quote scrolls
 * through the viewport (scrubbed, no pinning). The last word is lit just before
 * the quote reaches the middle of the screen, which is where the page stops on it. With reduced motion nothing
 * runs and the CSS final state (all words lit) is shown.
 */
export function useQuoteMotion(scope: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = scope.current
    if (!root) return

    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(root)

      gsap
        .timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: q('[data-quote-text]')[0],
            start: 'top 88%',
            end: 'center 56%',
            scrub: 0.4,
          },
        })
        .fromTo(q('[data-quote-word]'), { opacity: 0.2 }, { opacity: 1, stagger: 1 })
    })

    return () => mm.revert()
  }, [scope])
}
