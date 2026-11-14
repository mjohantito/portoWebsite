import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * All hero animation: intro timeline, pointer parallax + key light,
 * scroll scrub, and the magnetic CTA.
 *
 * Everything lives inside a gsap.matchMedia() scoped to
 * `prefers-reduced-motion: no-preference`, so with reduced motion nothing
 * runs and the CSS final state is shown as-is. Each animated property sits on
 * its own element (intro on the img/letters, parallax on the "depth" wrappers,
 * scroll on the outer wrappers) so the effects never fight over a transform.
 */
export function useHeroMotion(scope: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = scope.current
    if (!root) return

    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(root)
      let alive = true

      /* ---------- 1. Intro timeline (~2.5s) ---------- */
      const intro = gsap.timeline({ paused: true })

      intro
        // grid draws in, then settles to its resting opacity
        .from(q('[data-grid="h"]'), { scaleX: 0, duration: 0.9, ease: 'power3.inOut' }, 0)
        .from(q('[data-grid="v"]'), { scaleY: 0, duration: 0.9, ease: 'power3.inOut' }, 0.1)
        .fromTo(
          q('[data-grid]'),
          { opacity: 1 },
          { opacity: 0.4, duration: 0.9, ease: 'power2.out' },
          0.8,
        )
        // portrait comes up out of the dark
        .fromTo(
          q('[data-portrait-img]'),
          { opacity: 0, scale: 1.08 },
          { opacity: 1, scale: 1, duration: 1.9, ease: 'power2.out' },
          0.3,
        )
        // name letters rise from behind their masks
        .from(
          q('[data-char]'),
          { yPercent: 112, duration: 0.9, ease: 'expo.out', stagger: 0.055 },
          0.8,
        )
        // supporting UI last. Nav + CTA ([data-early]) start dimmed but visible
        // and are clickable from the first frame.
        .fromTo(
          q('[data-fade]'),
          {
            opacity: (_i: number, el: Element) => (el.hasAttribute('data-early') ? 0.55 : 0),
            y: 10,
          },
          { opacity: 1, y: 0, duration: 0.65, ease: 'power2.out', stagger: 0.05 },
          1.45,
        )

      // Hold on black until the display face is ready so the reveal never
      // shows a font swap. Falls through after a short timeout regardless.
      const startIntro = () => {
        if (alive && intro.paused()) intro.play()
      }
      const fontTimeout = window.setTimeout(startIntro, 900)
      document.fonts.load('1em Anton').then(startIntro, startIntro)

      /* ---------- 2. Scroll scrub ---------- */
      const drift = () => window.innerWidth * 0.08
      const scrollTl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      })
      scrollTl
        .to(q('[data-word="first"]'), { x: () => -drift() }, 0)
        .to(q('[data-word="last"]'), { x: () => drift() }, 0)
        .to(q('[data-portrait]'), { scale: 0.94, opacity: 0.35 }, 0)

      /* ---------- 3. Pointer: parallax, key light, magnetic CTA ---------- */
      const cleanups: Array<() => void> = []

      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        const quick = (target: Element | null, prop: string, duration: number) =>
          target ? gsap.quickTo(target, prop, { duration, ease: 'power3.out' }) : null

        const portrait = q('[data-depth="portrait"]')[0] ?? null
        const first = q('[data-depth="first"]')[0] ?? null
        const last = q('[data-depth="last"]')[0] ?? null
        const light = q('[data-light]')[0] ?? null
        const spot = q('[data-spot]')[0] ?? null
        const spotGrid = q('[data-spot-grid]')[0] ?? null

        const layers = [
          { x: quick(portrait, 'x', 1), y: quick(portrait, 'y', 1), depth: -6 },
          { x: quick(first, 'x', 0.8), y: quick(first, 'y', 0.8), depth: 12 },
          { x: quick(last, 'x', 0.8), y: quick(last, 'y', 0.8), depth: 18 },
        ]
        const lightX = quick(light, 'x', 0.5)
        const lightY = quick(light, 'y', 0.5)
        const spotX = quick(spot, 'x', 0.35)
        const spotY = quick(spot, 'y', 0.35)
        // counter-moves the bright grid so it stays registered with the base grid
        const spotGridX = quick(spotGrid, 'x', 0.35)
        const spotGridY = quick(spotGrid, 'y', 0.35)

        let lit = false

        const onMove = (e: PointerEvent) => {
          if (e.pointerType !== 'mouse') return
          const rect = root.getBoundingClientRect()
          const px = e.clientX - rect.left
          const py = e.clientY - rect.top
          const nx = px / rect.width - 0.5
          const ny = py / rect.height - 0.5

          for (const layer of layers) {
            layer.x?.(nx * layer.depth)
            layer.y?.(ny * layer.depth)
          }
          lightX?.(px)
          lightY?.(py)
          spotX?.(px)
          spotY?.(py)
          spotGridX?.(-px)
          spotGridY?.(-py)

          if (!lit) {
            lit = true
            gsap.to([light, spot], { opacity: 1, duration: 0.8, ease: 'power2.out' })
          }
        }

        const onLeave = () => {
          for (const layer of layers) {
            layer.x?.(0)
            layer.y?.(0)
          }
          lit = false
          gsap.to([light, spot], { opacity: 0, duration: 0.8, ease: 'power2.out' })
        }

        root.addEventListener('pointermove', onMove)
        root.addEventListener('pointerleave', onLeave)
        cleanups.push(() => {
          root.removeEventListener('pointermove', onMove)
          root.removeEventListener('pointerleave', onLeave)
        })

        // magnetic CTA
        const field = q('[data-magnetic-field]')[0] as HTMLElement | undefined
        const button = q('[data-magnetic]')[0] as HTMLElement | undefined
        if (field && button) {
          const bx = gsap.quickTo(button, 'x', { duration: 0.45, ease: 'power3.out' })
          const by = gsap.quickTo(button, 'y', { duration: 0.45, ease: 'power3.out' })

          const onFieldMove = (e: PointerEvent) => {
            const rect = field.getBoundingClientRect()
            bx((e.clientX - (rect.left + rect.width / 2)) * 0.3)
            by((e.clientY - (rect.top + rect.height / 2)) * 0.4)
          }
          const onFieldLeave = () => {
            bx(0)
            by(0)
          }

          field.addEventListener('pointermove', onFieldMove)
          field.addEventListener('pointerleave', onFieldLeave)
          cleanups.push(() => {
            field.removeEventListener('pointermove', onFieldMove)
            field.removeEventListener('pointerleave', onFieldLeave)
          })
        }
      }

      // Runs when the media query stops matching or on mm.revert().
      // GSAP reverts every tween, quickTo and ScrollTrigger created above.
      return () => {
        alive = false
        window.clearTimeout(fontTimeout)
        cleanups.forEach((fn) => fn())
      }
    })

    return () => mm.revert()
  }, [scope])
}
