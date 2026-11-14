import { useRef } from 'react'
import { SOCIAL_LINKS } from '../../data/socials'
import { useHeroMotion } from './useHeroMotion'
import './Hero.css'

const NAV_LINKS = [
  { label: 'About', href: '#about' },
  { label: 'Business', href: '#business' },
  { label: 'Work', href: '#work' },
  { label: 'Notes', href: '#notes' },
  { label: 'Contact', href: '#contact' },
]

const PORTRAIT_SRCSET =
  '/images/portrait-560.webp 560w, /images/portrait-840.webp 840w, /images/portrait-1086.webp 1086w'
/* Keep in sync with the preload in index.html */
const PORTRAIT_SIZES = '(max-width: 860px) 100vw, 70vh'

/** One name word, split into masked letters for the reveal. Decorative only. */
function SplitWord({ text, modifier }: { text: string; modifier: 'first' | 'last' }) {
  return (
    <span className={`hero__word hero__word--${modifier}`} data-word={modifier}>
      <span className="hero__word-depth" data-depth={modifier}>
        {Array.from(text).map((char, i) => (
          <span key={i} className="hero__char-mask">
            <span className="hero__char" data-char>
              {char}
            </span>
          </span>
        ))}
      </span>
    </span>
  )
}

export default function Hero() {
  const rootRef = useRef<HTMLElement>(null)
  useHeroMotion(rootRef)

  return (
    <section ref={rootRef} className="hero" id="top" aria-labelledby="hero-name" data-snap>
      <header className="hero__header">
        <nav className="hero__nav" aria-label="Primary" data-fade data-early>
          <ul>
            {NAV_LINKS.map((link, i) => (
              <li key={link.href}>
                <a href={link.href}>
                  <span className="hero__nav-index" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="hero__nav-label">{link.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <p className="hero__label" data-fade>
          {'// portfolio 2026'}
        </p>

        <ul className="hero__socials" aria-label="Social profiles" data-fade>
          {SOCIAL_LINKS.map(({ label, href, Icon }) => {
            const external = href.startsWith('http')
            return (
              <li key={label}>
                <a
                  href={href}
                  aria-label={label}
                  {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
                >
                  <Icon />
                </a>
              </li>
            )
          })}
        </ul>
      </header>

      <div className="hero__stage">
        <div className="hero__portrait" data-portrait>
          <div className="hero__portrait-depth" data-depth="portrait">
            <picture>
              <source type="image/webp" srcSet={PORTRAIT_SRCSET} sizes={PORTRAIT_SIZES} />
              <img
                src="/images/portrait-1086.jpg"
                width={1086}
                height={1448}
                alt="Portrait of Manuel Tito"
                fetchPriority="high"
                decoding="async"
                data-portrait-img
              />
            </picture>
          </div>
        </div>

        <h1 className="hero__name" id="hero-name" tabIndex={-1}>
          <span className="visually-hidden">Manuel Tito</span>
          <span className="hero__name-visual" aria-hidden="true">
            <SplitWord text="MANUEL" modifier="first" />
            <SplitWord text="TITO" modifier="last" />
          </span>
        </h1>
      </div>

      {/* Full-hero overlays: cursor key light (pointer devices only) and the grid */}
      <div className="hero__light" data-light aria-hidden="true" />

      <div className="hero__grid" aria-hidden="true">
        <div className="hero__grid-lines hero__grid-lines--h" data-grid="h" />
        <div className="hero__grid-lines hero__grid-lines--v" data-grid="v" />
        <div className="hero__spot" data-spot>
          <div className="hero__spot-grid" data-spot-grid />
        </div>
      </div>

      <div className="hero__action">
        <p className="hero__role" data-fade>
          Founder &amp; Developer
          <span className="hero__caret" aria-hidden="true" />
        </p>
        <div className="hero__cta-field" data-fade data-early data-magnetic-field>
          <a className="hero__cta" href="#contact" data-magnetic>
            Get in touch
            <span className="hero__cta-arrow" aria-hidden="true">
              &rarr;
            </span>
          </a>
        </div>
      </div>

      <p className="hero__meta hero__meta--left" aria-hidden="true" data-fade>
        &darr; scroll
      </p>
      <p className="hero__meta hero__meta--right" aria-hidden="true" data-fade>
        ID &mdash; Indonesia
      </p>

      <div className="hero__grain" aria-hidden="true" />
    </section>
  )
}
