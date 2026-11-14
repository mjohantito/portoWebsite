import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { registerEntrance } from '../../scroll/snap'

gsap.registerPlugin(ScrollTrigger, SplitText)

/**
 * About section animation, staged like a slow film shot:
 *   1. light-up   the card fades up as if a spotlight came on; the photo opens
 *                 from the centre and settles from 1.12 to 1; one light sweep
 *   2. text       headline lines rise with a focus pull, body copy line by line
 *   3. dolly      a slow scrubbed push-in on the photo while the section is in view
 *   4. exit       the photo dims and the text leaves a little faster than the card
 *   5. pointer    the card tilts toward the cursor with a moving highlight
 *
 * Same pattern as the hero: everything lives in a gsap.matchMedia() scoped to
 * `prefers-reduced-motion: no-preference`, so with reduced motion nothing runs
 * and the CSS final state is shown.
 */
export function useAboutMotion(scope: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = scope.current
    if (!root) return

    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(root)
      const media = q('[data-about-media]')[0] as HTMLElement
      const content = q('[data-about-content]')[0]
      const dolly = q('[data-about-dolly]')

      /* ---------- 1. Light-up ----------
         Entrances are started by the snap controller as the page glides in
         (or by a ScrollTrigger where the page is not snapping), and are timed
         so everything is in place about a second after landing. */
      const light = gsap
        .timeline({ paused: true })
        .fromTo(
          q('[data-about-spot]'),
          { opacity: 0, scale: 0.8 },
          { opacity: 1, scale: 1, duration: 1.8, ease: 'power2.out' },
          0,
        )
        .fromTo(
          q('[data-about-card]'),
          { opacity: 0, y: 36, filter: 'brightness(0.3)' },
          {
            opacity: 1,
            y: 0,
            filter: 'brightness(1)',
            duration: 1.3,
            ease: 'power2.out',
            clearProps: 'filter',
          },
          0,
        )
        .fromTo(
          q('[data-about-mask]'),
          { clipPath: 'inset(46% 46% 46% 46% round 20px)' },
          {
            clipPath: 'inset(0% 0% 0% 0% round 20px)',
            duration: 1.2,
            ease: 'expo.inOut',
            clearProps: 'clipPath',
          },
          0.05,
        )
        .fromTo(
          q('[data-about-img]'),
          { scale: 1.12 },
          { scale: 1, duration: 2.4, ease: 'power2.out' },
          0.05,
        )
        // one sweep of light across the card and along its border
        .fromTo(
          q('[data-about-edge], [data-about-sheen]'),
          { xPercent: -110, opacity: 1 },
          { xPercent: 110, duration: 1.4, ease: 'power2.inOut' },
          1.2,
        )
        .set(q('[data-about-edge], [data-about-sheen]'), { opacity: 0 })

      registerEntrance(media, { play: () => light.play(), finish: () => light.progress(1) })

      /* ---------- 2. Text: headline lines, then body copy line by line ---------- */
      // Lines are split at runtime (and re-split if fonts or width change before
      // the reveal). Each split is undone once its animation has finished, so the
      // resting DOM is the plain markup again.
      let started = false
      const textTweens: gsap.core.Tween[] = []

      const headSplit = SplitText.create(q('[data-about-headline]'), {
        type: 'lines',
        mask: 'lines',
        linesClass: 'about__line',
        aria: 'none',
        autoSplit: true,
        onSplit(self: SplitText) {
          return (textTweens[0] = gsap.fromTo(
            self.lines,
            { yPercent: 118, filter: 'blur(6px)' },
            {
              yPercent: 0,
              filter: 'blur(0px)',
              duration: 1,
              ease: 'expo.out',
              stagger: 0.08,
              delay: 0.1,
              paused: !started,
              onComplete: () => self.revert(), // also drops the blur filter
            },
          ))
        },
      })

      const bodySplit = SplitText.create(q('[data-about-lines]'), {
        type: 'lines',
        aria: 'none',
        autoSplit: true,
        onSplit(self: SplitText) {
          return (textTweens[1] = gsap.fromTo(
            self.lines,
            { opacity: 0, y: 14 },
            {
              opacity: 1,
              y: 0,
              duration: 0.6,
              ease: 'power2.out',
              stagger: 0.05,
              delay: 0.45,
              paused: !started,
              onComplete: () => self.revert(),
            },
          ))
        },
      })

      // intro line with the headline, social buttons last
      const fades = q('[data-about-fade]')
      textTweens[2] = gsap.fromTo(
        fades,
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out',
          delay: (i: number) => (i === 0 ? 0.05 : 0.85 + i * 0.06),
          paused: true,
        },
      )

      registerEntrance(content, {
        play: () => {
          started = true
          textTweens.forEach((tween) => tween.play())
        },
        finish: () => {
          started = true
          textTweens.forEach((tween) => tween.progress(1))
        },
      })

      /* ---------- 3. Dolly: slow push-in while the section is on screen ---------- */
      gsap.fromTo(
        dolly,
        { scale: 1, y: -8 },
        {
          scale: 1.06,
          y: 8,
          ease: 'none',
          scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom top', scrub: 0.8 },
        },
      )

      /* ---------- 4. Exit: photo dims, text leaves faster than the card ---------- */
      gsap
        .timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: root, start: 'bottom 85%', end: 'bottom 5%', scrub: 0.5 },
        })
        .to(dolly, { opacity: 0.3 }, 0)
        .to(media, { y: -18 }, 0)
        .to(content, { y: -64 }, 0)

      /* ---------- 5. Pointer: tilt toward the cursor, moving highlight ---------- */
      let removePointer = () => {}

      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        const tilt = q('[data-about-tilt]')[0]
        const glare = q('[data-about-glare]')[0]
        const MAX_TILT = 2.5 // degrees

        gsap.set(tilt, { transformPerspective: 900 })
        const quick = (target: Element, prop: string, duration: number) =>
          gsap.quickTo(target, prop, { duration, ease: 'power3.out' })
        const rotX = quick(tilt, 'rotationX', 0.7)
        const rotY = quick(tilt, 'rotationY', 0.7)
        const glareX = quick(glare, 'x', 0.45)
        const glareY = quick(glare, 'y', 0.45)
        const glareO = quick(glare, 'opacity', 0.5)

        const onMove = (e: PointerEvent) => {
          if (e.pointerType !== 'mouse') return
          const rect = media.getBoundingClientRect()
          const nx = (e.clientX - rect.left) / rect.width - 0.5
          const ny = (e.clientY - rect.top) / rect.height - 0.5
          // the card turns its face toward the cursor
          rotY(nx * 2 * MAX_TILT)
          rotX(-ny * 2 * MAX_TILT)
          glareX(nx * rect.width)
          glareY(ny * rect.height)
          glareO(1)
        }
        const onLeave = () => {
          rotX(0)
          rotY(0)
          glareO(0)
        }

        media.addEventListener('pointermove', onMove)
        media.addEventListener('pointerleave', onLeave)
        removePointer = () => {
          media.removeEventListener('pointermove', onMove)
          media.removeEventListener('pointerleave', onLeave)
        }
      }

      return () => {
        removePointer()
        headSplit.revert()
        bodySplit.revert()
      }
    })

    return () => mm.revert()
  }, [scope])
}
