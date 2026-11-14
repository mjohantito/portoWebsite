import { useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import type { Photo } from '../data/photos'
import TransitionLink from '../transition/TransitionLink'
import { arrivalDelay, isTransitioning, pageGone, pageReady } from '../transition/transition'
import './Placeholder.css'

gsap.registerPlugin(SplitText)

const SITE_TITLE = document.title

/** A photo across the top of the page. `key` ties it to the same photo on the home page. */
export interface PageVisual {
  photo: Photo
  alt: string
  key: string
}

/**
 * A page that is not built yet: its title, one line saying so, and the way
 * back. `section` is the home section the back link returns to when the
 * visitor did not come from the home page (which otherwise remembers the exact
 * spot they left). With a `visual`, that photo fills the first screen behind
 * the title.
 *
 * On arrival the title and the lines under it rise from behind a mask. When
 * the page is reached through a page transition, that waits a moment for the
 * transition's cover to start clearing.
 */
export default function Placeholder({
  title,
  section,
  visual,
}: {
  title: string
  section: string
  visual?: PageVisual
}) {
  const rootRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    document.title = `${title} — Manuel Tito`
    // announce the new page to screen readers and keyboard users
    headingRef.current?.focus({ preventScroll: true })
    pageReady(pathname)
    return () => {
      document.title = SITE_TITLE
      pageGone(pathname)
    }
  }, [title, pathname])

  useLayoutEffect(() => {
    const root = rootRef.current
    const heading = headingRef.current
    if (!root || !heading) return

    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(root)
      const arriving = isTransitioning()
      const delay = arrivalDelay()

      // the title, line by line, from behind a mask
      let first = true
      const split = SplitText.create(heading, {
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

      gsap.from(q('[data-page-rise]'), {
        yPercent: 115,
        duration: 0.9,
        ease: 'expo.out',
        stagger: 0.1,
        delay: delay + 0.3,
      })
      gsap.from(q('[data-page-back]'), {
        y: 20,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        delay: delay + 0.55,
        clearProps: 'transform,opacity',
      })

      // the shade over the photo comes in with the text. A page transition
      // hands over on the bare photo; a direct load fades the photo in too.
      gsap.from(q('[data-page-shade]'), { opacity: 0, duration: 1, ease: 'power1.out', delay })
      if (!arriving) {
        gsap.from(q('[data-page-photo]'), {
          opacity: 0,
          scale: 1.06,
          duration: 1.4,
          ease: 'power2.out',
        })
      }

      return () => split.revert()
    })

    return () => mm.revert()
  }, [title])

  return (
    <main ref={rootRef} className={`page${visual ? ' page--visual' : ''}`}>
      {visual && (
        <figure className="page__visual" data-shared={visual.key}>
          <img
            src={visual.photo.src}
            srcSet={visual.photo.srcSet}
            sizes="100vw"
            width={visual.photo.width}
            height={visual.photo.height}
            alt={visual.alt}
            data-page-photo
          />
          <span className="page__shade" data-page-shade />
        </figure>
      )}

      <div className="page__content">
        <p className="page__label page__mask">
          <span data-page-rise>{'// manuel tito'}</span>
        </p>
        <h1 className="page__title" ref={headingRef} tabIndex={-1}>
          {title}
        </h1>
        <p className="page__note page__mask">
          <span data-page-rise>This page is being built.</span>
        </p>
        <TransitionLink className="page__back" to="/" state={{ section }} data-page-back>
          <span className="page__back-arrow" aria-hidden="true">
            &larr;
          </span>
          Back to home
        </TransitionLink>
      </div>
    </main>
  )
}
