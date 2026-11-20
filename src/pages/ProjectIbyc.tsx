import { useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { galleryPhotos, heroPhoto, ibyc2023 as c } from '../content/ibyc-2023'
import type { Photo } from '../data/photos'
import { usePageScroll } from '../hooks/useSmoothScroll'
import { projectPhotoKey } from '../transition/routes'
import TransitionLink from '../transition/TransitionLink'
import { pageGone, pageReady } from '../transition/transition'
import { useCaseStudyMotion } from './useCaseStudyMotion'
import './ProjectIbyc.css'

const SITE_TITLE = document.title
const formatNumber = (n: number) => n.toLocaleString('en-US')

/** Sets the page's description meta tag while the page is open. */
function useMetaDescription(text: string) {
  useLayoutEffect(() => {
    const tag = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!tag) return
    const previous = tag.content
    tag.content = text
    return () => {
      tag.content = previous
    }
  }, [text])
}

function BackLink({ className }: { className: string }) {
  return (
    <TransitionLink className={className} to="/" state={{ section: c.back.section }}>
      <span className="cs__back-arrow" aria-hidden="true">
        &larr;
      </span>
      {c.back.label}
    </TransitionLink>
  )
}

/** Keeps hyphenated words ("D-Day") on one line in large type. */
function NoBreak({ text }: { text: string }) {
  return text.split(' ').map((word, i) => (
    <span key={i}>
      {i > 0 && ' '}
      {word.includes('-') ? <span className="cs__nowrap">{word}</span> : word}
    </span>
  ))
}

/** A photo, or the site's dark placeholder card when the file is missing. */
function StoryImage({ photo, alt, sizes }: { photo: Photo | null; alt: string; sizes: string }) {
  if (!photo) return <span className="cs__placeholder" aria-hidden="true" />
  return (
    <img
      src={photo.src}
      srcSet={photo.srcSet}
      sizes={sizes}
      width={photo.width}
      height={photo.height}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  )
}

/**
 * The recap video. Nothing is requested from YouTube until the visitor
 * presses play; then the privacy-enhanced player loads and starts.
 */
function RecapVideo() {
  const [playing, setPlaying] = useState(false)
  const { id, title } = c.media.video

  return (
    <div className="cs__video" data-cs-reveal>
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button type="button" className="cs__video-poster" onClick={() => setPlaying(true)}>
          {/* the poster is the page's own hero photo, so nothing loads from YouTube yet */}
          {heroPhoto ? (
            <img
              src={heroPhoto.src}
              srcSet={heroPhoto.srcSet}
              sizes="(max-width: 900px) 100vw, 70rem"
              alt=""
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="cs__placeholder" />
          )}
          <span className="cs__play" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor" focusable="false">
              <path d="M6 3.5v15L18.5 11z" />
            </svg>
          </span>
          <span className="cs__video-label">Play the {title}</span>
        </button>
      )}
    </div>
  )
}

/**
 * /projects/ibyc-2023: the IBYC case study. All copy and photos come from
 * src/content/ibyc-2023.ts. A long page: Lenis smooth scrolling, no section
 * snapping. The page transition from the Selected Work card grows the card's
 * photo into the hero (data-shared), and plays back the other way.
 */
export default function ProjectIbyc() {
  const rootRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const { pathname } = useLocation()

  usePageScroll()
  useMetaDescription(c.metaDescription)
  useCaseStudyMotion(rootRef, headingRef)

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    document.title = c.pageTitle
    // announce the new page to screen readers and keyboard users
    headingRef.current?.focus({ preventScroll: true })
    pageReady(pathname)
    return () => {
      document.title = SITE_TITLE
      pageGone(pathname)
    }
  }, [pathname])

  const { hero, numbers, event, role, journey, challenge, results, learned, media } = c

  return (
    <main ref={rootRef} className="cs">
      <header className="cs__bar">
        <TransitionLink className="cs__site" to="/">
          Manuel Tito
        </TransitionLink>
        <BackLink className="cs__back cs__back--top" />
      </header>

      {/* ---------- 1. Hero ---------- */}
      <section className="cs__hero" aria-labelledby="cs-title">
        <figure
          className="cs__hero-visual"
          data-shared={heroPhoto ? projectPhotoKey('ibyc') : undefined}
        >
          {/* story/hero.jpg, else the first Selected Work photo, else this dark card */}
          {heroPhoto ? (
            <img
              src={heroPhoto.src}
              srcSet={heroPhoto.srcSet}
              sizes="100vw"
              width={heroPhoto.width}
              height={heroPhoto.height}
              alt={hero.heroAlt}
              data-cs-hero-img
            />
          ) : (
            <span className="cs__placeholder" aria-hidden="true" />
          )}
          <span className="cs__hero-shade" data-cs-hero-shade />
        </figure>

        <div className="cs__hero-text">
          <p className="cs__subtitle cs__mask">
            <span data-cs-rise>{hero.subtitle}</span>
          </p>
          <h1 className="cs__title" id="cs-title" ref={headingRef} tabIndex={-1}>
            {hero.title}
          </h1>
          <ul className="cs__chips" aria-label="My roles" data-cs-hero-fade>
            {hero.roles.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <ul className="cs__meta" data-cs-hero-fade>
            {hero.meta.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      </section>

      <div className="cs__body">
        {/* ---------- 2. Key numbers ---------- */}
        <section className="cs__section" aria-labelledby="cs-numbers">
          <h2 className="cs__label" id="cs-numbers" data-cs-reveal>
            {numbers.label}
          </h2>
          <ul className="cs__numbers">
            {numbers.items.map((item) => (
              <li key={item.label} className="cs__number" data-cs-reveal>
                {/* screen readers get the final value; the animated digits are hidden */}
                <span className="visually-hidden">
                  {formatNumber(item.value)}
                  {item.suffix} {item.label}
                </span>
                <span className="cs__number-value" aria-hidden="true">
                  <span data-cs-count={item.value}>{formatNumber(item.value)}</span>
                  {item.suffix}
                </span>
                <span className="cs__number-label" aria-hidden="true">
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
          <p className="cs__sponsors" data-cs-reveal>
            {numbers.sponsors}
          </p>
        </section>

        {/* ---------- 3. The event ---------- */}
        <section className="cs__section cs__split" aria-labelledby="cs-event">
          <h2 className="cs__label" id="cs-event" data-cs-reveal>
            {event.label}
          </h2>
          <p className="cs__lead" data-cs-reveal>
            {event.body}
          </p>
        </section>

        {/* ---------- 4. My role ---------- */}
        <section className="cs__section" aria-labelledby="cs-role">
          <h2 className="cs__label" id="cs-role" data-cs-reveal>
            {role.label}
          </h2>
          <div className="cs__roles">
            {role.items.map((item) => (
              <article key={item.title} className="cs__role" data-cs-reveal>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ---------- 5. The journey ---------- */}
        <section className="cs__section cs__split" aria-labelledby="cs-journey">
          <h2 className="cs__label" id="cs-journey" data-cs-reveal>
            {journey.label}
          </h2>
          <div className="cs__timeline" data-cs-timeline>
            <span className="cs__timeline-track" aria-hidden="true">
              <span className="cs__timeline-line" data-cs-line />
            </span>
            <ol>
            {journey.steps.map((step, i) => (
              <li key={step.text} className="cs__step" data-cs-step>
                <span className="cs__step-dot" aria-hidden="true" />
                <span className="cs__step-when">
                  {step.date ?? <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>}
                </span>
                <span className="cs__step-text">{step.text}</span>
              </li>
            ))}
            </ol>
          </div>
        </section>

        {/* ---------- 6. The challenge ---------- */}
        <section className="cs__section" aria-labelledby="cs-challenge">
          <h2 className="cs__label" id="cs-challenge" data-cs-reveal>
            {challenge.label}
          </h2>
          <blockquote className="cs__pull" data-cs-reveal>
            <p>
              <NoBreak text={challenge.statement} />{' '}
              <span className="cs__pull-follow">
                <NoBreak text={challenge.follow} />
              </span>
            </p>
          </blockquote>
          {challenge.challengeExample && (
            <p className="cs__example" data-cs-reveal>
              {challenge.challengeExample}
            </p>
          )}
        </section>

        {/* ---------- 7. Results ---------- */}
        <section className="cs__section cs__split" aria-labelledby="cs-results">
          <h2 className="cs__label" id="cs-results" data-cs-reveal>
            {results.label}
          </h2>
          <ul className="cs__results">
            {results.items.map((item) => (
              <li key={item.text} data-cs-reveal>
                {item.highlight && <strong className="cs__highlight">{item.highlight}</strong>}{' '}
                {item.text}
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- 8. What I learned ---------- */}
        <section className="cs__section cs__split" aria-labelledby="cs-learned">
          <h2 className="cs__label" id="cs-learned" data-cs-reveal>
            {learned.label}
          </h2>
          <ol className="cs__learned">
            {learned.items.map((item) => (
              <li key={item} data-cs-reveal>
                {item}
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- Testimonial: only once one is supplied ---------- */}
        {c.testimonial && (
          <section className="cs__section" aria-label="Testimonial">
            <figure className="cs__testimonial" data-cs-reveal>
              <blockquote>
                <p>{c.testimonial.quote}</p>
              </blockquote>
              <figcaption>
                {c.testimonial.name}, {c.testimonial.role}
              </figcaption>
            </figure>
          </section>
        )}

        {/* ---------- 9. Media and links ---------- */}
        <section className="cs__section" aria-labelledby="cs-media">
          <h2 className="cs__label" id="cs-media" data-cs-reveal>
            {media.label}
          </h2>
          <RecapVideo />

          <ul className="cs__links">
            {media.links.map((link) => (
              <li key={link.url} data-cs-reveal>
                <a
                  className="cs__link"
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="cs__link-kicker">{link.kicker}</span>
                  <span className="cs__link-title">
                    {link.title}
                    <span className="cs__link-arrow" aria-hidden="true">
                      &#8599;
                    </span>
                  </span>
                  {link.note && <span className="cs__link-note">{link.note}</span>}
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>

          <h3 className="cs__label cs__label--sub" data-cs-reveal>
            {media.galleryLabel}
          </h3>
          <ul className="cs__gallery">
            {galleryPhotos.map((photo, i) => (
              // slot i + 1: src/assets/projects/ibyc/story/gallery-{i + 1}.jpg
              <li key={i} className="cs__gallery-item" data-cs-reveal>
                <StoryImage
                  photo={photo}
                  alt={`${media.galleryAlt} ${i + 1}`}
                  sizes="(max-width: 600px) 50vw, 33vw"
                />
              </li>
            ))}
          </ul>
        </section>

        <footer className="cs__end">
          <BackLink className="cs__back cs__back--bottom" />
        </footer>
      </div>
    </main>
  )
}
