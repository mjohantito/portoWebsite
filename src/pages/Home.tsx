import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import About from '../components/About/About'
import Business from '../components/Business/Business'
import Contact from '../components/Contact/Contact'
import Hero from '../components/Hero/Hero'
import Quote from '../components/Quote/Quote'
import Work from '../components/Work/Work'
import { getLeftAt, getLeftY, useSmoothScroll } from '../hooks/useSmoothScroll'
import { hasChangedRoute, pageGone, pageReady } from '../transition/transition'

/**
 * The one-page site. Lenis, section snapping and every ScrollTrigger live and
 * die with this component, so other routes scroll natively.
 *
 * It opens on, in order of preference: the exact stop (or, where the page
 * scrolls freely, the exact position) it was on when the visitor left for
 * another page; the section a "Back to home" link names; a #hash in the URL;
 * the top.
 */
export default function Home() {
  const mainRef = useRef<HTMLElement>(null)
  const location = useLocation()
  const [start] = useState(() => {
    const named = (location.state as { section?: string } | null)?.section
    return { at: getLeftAt() ?? named ?? (location.hash.slice(1) || null), y: getLeftY() }
  })
  // page transitions wait for this before they show the page
  useSmoothScroll(mainRef, start.at, start.y, () => pageReady('/'))

  useEffect(() => {
    // after a route change, keyboard focus goes to the page's h1 (never on
    // the first load, and without scrolling to it)
    if (hasChangedRoute()) document.getElementById('hero-name')?.focus({ preventScroll: true })
    return () => pageGone('/')
  }, [])

  return (
    <main ref={mainRef}>
      <Hero />
      <Quote />
      <About />
      <Business />
      <Work />
      <Contact />
    </main>
  )
}
