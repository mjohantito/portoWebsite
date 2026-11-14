import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { registerEntrance } from '../../scroll/snap'

/**
 * Contact motion: three short entrances (heading, form, cards) and the
 * magnetic submit button.
 *
 * The entrances are registered with the snap controller, which starts them as
 * the page glides in; where the page is not snapping, each runs from its own
 * ScrollTrigger as it scrolls into view. Hover states and the word swap are
 * CSS, driven by the component. With reduced motion nothing here runs.
 */
export function useContactMotion(scope: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = scope.current
    if (!root) return

    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(root)
      const entrance = (el: Element, timeline: gsap.core.Timeline, start?: string) =>
        registerEntrance(
          el,
          { play: () => timeline.play(), finish: () => timeline.progress(1) },
          start,
        )

      /* ---------- Heading: mono letters one by one, then the italic word ---------- */
      entrance(
        q('[data-contact-heading]')[0],
        gsap
          .timeline({ paused: true })
          .from(
            q('[data-contact-char]'),
            { yPercent: 115, duration: 0.75, ease: 'expo.out', stagger: 0.045 },
            0,
          )
          .from(
            q('[data-contact-serif]'),
            { opacity: 0, x: -18, duration: 0.8, ease: 'power3.out' },
            0.4,
          ),
        'top 85%',
      )

      /* ---------- Form: underlines draw left to right, fields fade in one by one ---------- */
      entrance(
        q('[data-contact-form]')[0],
        gsap
          .timeline({ paused: true })
          .from(
            q('[data-contact-line]'),
            { scaleX: 0, duration: 0.8, ease: 'power3.inOut', stagger: 0.11 },
            0.2,
          )
          .from(
            q('[data-contact-field] > :not([data-contact-line])'),
            // label, input and (empty) error line of each field move as one group
            { opacity: 0, y: 12, duration: 0.6, ease: 'power2.out', stagger: { each: 0.11 / 3 } },
            0.25,
          )
          .from(
            q('[data-contact-submit]'),
            { opacity: 0, y: 12, duration: 0.6, ease: 'power2.out' },
            0.7,
          ),
        'top 85%',
      )

      /* ---------- Cards rise with a stagger; the big word slides up behind them ---------- */
      entrance(
        q('[data-contact-find]')[0],
        gsap
          .timeline({ paused: true })
          .from(
            q('[data-contact-card]'),
            {
              y: 56,
              opacity: 0,
              duration: 0.95,
              ease: 'expo.out',
              stagger: 0.1,
              clearProps: 'opacity,transform',
            },
            0.25,
          )
          .from(
            q('[data-contact-word]'),
            { yPercent: 55, opacity: 0, duration: 1.1, ease: 'expo.out' },
            0.45,
          ),
        'top 85%',
      )

      /* ---------- Magnetic submit button, like the hero CTA ---------- */
      let removeMagnet = () => {}
      const field = q('[data-magnetic-field]')[0] as HTMLElement | undefined
      const button = q('[data-magnetic]')[0] as HTMLElement | undefined

      if (field && button && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        const moveX = gsap.quickTo(button, 'x', { duration: 0.45, ease: 'power3.out' })
        const moveY = gsap.quickTo(button, 'y', { duration: 0.45, ease: 'power3.out' })

        const onMove = (e: PointerEvent) => {
          const rect = field.getBoundingClientRect()
          moveX((e.clientX - (rect.left + rect.width / 2)) * 0.12)
          moveY((e.clientY - (rect.top + rect.height / 2)) * 0.4)
        }
        const onLeave = () => {
          moveX(0)
          moveY(0)
        }

        field.addEventListener('pointermove', onMove)
        field.addEventListener('pointerleave', onLeave)
        removeMagnet = () => {
          field.removeEventListener('pointermove', onMove)
          field.removeEventListener('pointerleave', onLeave)
        }
      }

      return () => removeMagnet()
    })

    return () => mm.revert()
  }, [scope])
}
