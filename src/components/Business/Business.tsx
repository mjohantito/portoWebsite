import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import { BUSINESSES, photosOf, type Business as BusinessData } from '../../data/businesses'
import TransitionLink from '../../transition/TransitionLink'
import { businessPhotoKey } from '../../transition/routes'
import { InstagramIcon } from '../Hero/icons'
import { useBusinessMotion } from './useBusinessMotion'
import './Business.css'

/* one slide per business, then the empty "next venture" slot */
const SLIDE_COUNT = BUSINESSES.length + 1
const EMPTY = BUSINESSES.length

const DRAG_START = 8 // px of horizontal travel before a press becomes a drag
const DRAG_COMMIT = 70 // px needed to move to the next card

function ExternalArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false">
      <path d="M4 2.5h7.5V10M11.5 2.5 2.5 11.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function Chevron({ flip }: { flip?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path d="M5 2.5 9.5 7 5 11.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

/* the card shows the main photo and up to three more */
const MAX_PHOTOS = 4

/** The sharp photos inside the card: one large, the rest in a small mosaic. */
function Photos({ business }: { business: BusinessData }) {
  const photos = photosOf(business).slice(0, MAX_PHOTOS)

  if (photos.length === 0) {
    return (
      <div className="biz__photos" data-count={3}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="biz__photo biz__photo--empty" data-biz-photo>
            {business.shortName} photo
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="biz__photos" data-count={photos.length}>
      {photos.map((photo, i) => (
        <figure
          key={photo.src}
          className="biz__photo"
          data-biz-photo
          // the main photo is what the page transition to this business grows from
          data-shared={i === 0 ? businessPhotoKey(business.slug) : undefined}
        >
          {/* two layers: the entrance scales the wrapper, the slow drift moves the image */}
          <span className="biz__photo-zoom" data-biz-photo-zoom>
            <img
              src={photo.src}
              srcSet={photo.srcSet}
              sizes={
                i === 0 ? '(max-width: 900px) 56vw, 34vw' : '(max-width: 900px) 40vw, 20vw'
              }
              width={photo.width}
              height={photo.height}
              alt={`${business.photoAlt} ${i + 1}`}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </span>
        </figure>
      ))}
    </div>
  )
}

function BusinessCard({ business, active }: { business: BusinessData; active: boolean }) {
  const nameId = `business-${business.slug}-name`

  return (
    <article
      className="biz__card"
      aria-labelledby={nameId}
      style={{ '--accent': business.accent } as CSSProperties}
      // an off-centre card is visible but not reachable: no stray tab stops
      inert={!active}
      data-biz-card
    >
      <div className="biz__info">
        <p className="biz__label" data-biz-fade>
          {'// my business'}
        </p>
        <span
          className="biz__logo"
          role="img"
          aria-label={business.logo.alt}
          data-biz-fade
          dangerouslySetInnerHTML={{ __html: business.logo.svg }}
        />
        <h3 className="biz__title" id={nameId} data-biz-fade>
          {business.name}
        </h3>
        <p className="biz__tagline" data-biz-fade>
          <em>{business.tagline}</em>
        </p>
        <p className="biz__line" data-biz-fade>
          {business.description}
        </p>

        <dl className="biz__facts" data-biz-fade>
          <div className="biz__fact">
            <dt>{business.locations.label}</dt>
            <dd>
              <ul className="biz__places">
                {business.locations.places.map((place) => (
                  <li key={place}>{place}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div className="biz__fact">
            <dt>Role</dt>
            <dd>{business.role}</dd>
          </div>
        </dl>

        {/* the main action first; the other two stay side by side */}
        <div className="biz__actions" data-biz-fade>
          <a
            className="biz__btn biz__btn--primary"
            href={business.website.url}
            target="_blank"
            rel="noreferrer"
            draggable={false}
          >
            Visit {business.website.label}
            <ExternalArrow />
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
          <div className="biz__actions-pair">
            <TransitionLink
              className="biz__btn biz__btn--secondary"
              to={`/business/${business.slug}`}
              draggable={false}
            >
              What I do at {business.shortName}
            </TransitionLink>
            {business.instagram && (
              <a
                className="biz__btn biz__btn--secondary"
                href={business.instagram.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`${business.name} on Instagram`}
                draggable={false}
              >
                <InstagramIcon />
                {business.instagram.handle}
              </a>
            )}
          </div>
        </div>
      </div>

      <Photos business={business} />
    </article>
  )
}

export default function Business() {
  const rootRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLUListElement>(null)
  const [active, setActive] = useState(0)
  useBusinessMotion(rootRef)

  const go = (index: number) => setActive(Math.min(SLIDE_COUNT - 1, Math.max(0, index)))

  /* ---------- Drag / swipe ----------
     A press only becomes a drag once it has moved sideways, further than it
     has moved up or down. Vertical gestures are left to the page. */
  const drag = useRef<{ id: number; x: number; y: number; dx: number; on: boolean } | null>(null)
  const swallowClick = useRef(false)

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, on: false }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    const track = trackRef.current
    if (!d || !track || e.pointerId !== d.id) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y

    if (!d.on) {
      if (Math.abs(dy) > DRAG_START && Math.abs(dy) >= Math.abs(dx)) {
        drag.current = null // a vertical gesture: not ours
        return
      }
      if (Math.abs(dx) < DRAG_START) return
      d.on = true
      e.currentTarget.setPointerCapture(e.pointerId)
      track.classList.add('is-dragging')
    }

    // resist at either end of the row
    const outward = (active === 0 && dx > 0) || (active === SLIDE_COUNT - 1 && dx < 0)
    d.dx = outward ? dx * 0.25 : dx
    track.style.setProperty('--drag', `${d.dx}px`)
  }

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    const track = trackRef.current
    drag.current = null
    if (!d?.on || !track) return

    track.classList.remove('is-dragging')
    track.style.removeProperty('--drag')
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    if (d.dx <= -DRAG_COMMIT) go(active + 1)
    else if (d.dx >= DRAG_COMMIT) go(active - 1)

    // the click that ends a drag must not follow a link
    swallowClick.current = true
    window.setTimeout(() => (swallowClick.current = false), 0)
  }

  const onClickCapture = (e: MouseEvent) => {
    if (!swallowClick.current) return
    e.preventDefault()
    e.stopPropagation()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    go(active + (e.key === 'ArrowRight' ? 1 : -1))
  }

  const slideLabel = (index: number) =>
    index === EMPTY ? 'the next venture slot' : BUSINESSES[index].name

  return (
    <section
      ref={rootRef}
      className="biz"
      id="business"
      aria-labelledby="business-heading"
      data-snap
    >
      <h2 className="visually-hidden" id="business-heading">
        My business
      </h2>

      {/* ---------- Background: the active business's photo, pre-blurred ---------- */}
      <div className="biz__bg" data-biz-bg aria-hidden="true">
        {BUSINESSES.map((business, i) => (
          <img
            key={business.slug}
            className="biz__bg-img"
            data-active={i === active}
            src={business.backgroundImage}
            width={720}
            height={960}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ))}
        <div className="biz__shade" />
      </div>

      {/* a few slow embers, drawn only while the section is on screen */}
      <canvas className="biz__embers" data-biz-embers aria-hidden="true" />

      {/* ---------- Carousel ---------- */}
      <div
        className="biz__carousel"
        role="group"
        aria-roledescription="carousel"
        aria-label="Businesses"
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <div
          className="biz__viewport"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={onClickCapture}
          onDragStart={(e) => e.preventDefault()}
        >
          <ul
            ref={trackRef}
            className="biz__track"
            style={{ '--index': active } as CSSProperties}
          >
            {BUSINESSES.map((business, i) => (
              <li
                key={business.slug}
                className="biz__slide"
                data-active={i === active}
                onClick={i === active ? undefined : () => go(i)}
              >
                <BusinessCard business={business} active={i === active} />
              </li>
            ))}

            {/* room for whatever comes next: no name, no details */}
            <li
              className="biz__slide"
              data-active={active === EMPTY}
              onClick={active === EMPTY ? undefined : () => go(EMPTY)}
            >
              <div className="biz__card biz__card--empty" data-biz-card>
                <p className="biz__empty-label">Next venture</p>
                <p className="biz__empty-note">Coming soon</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="biz__controls" data-biz-controls>
          <button
            type="button"
            className="biz__arrow"
            aria-label="Previous card"
            // aria-disabled, not disabled: a disabled button would drop focus
            // and with it the carousel's arrow keys
            aria-disabled={active === 0}
            onClick={() => go(active - 1)}
          >
            <Chevron flip />
          </button>
          <ol className="biz__dots">
            {Array.from({ length: SLIDE_COUNT }, (_, i) => (
              <li key={i}>
                <button
                  type="button"
                  aria-label={`Show ${slideLabel(i)}`}
                  aria-current={i === active ? 'true' : undefined}
                  onClick={() => go(i)}
                />
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="biz__arrow"
            aria-label="Next card"
            aria-disabled={active === SLIDE_COUNT - 1}
            onClick={() => go(active + 1)}
          >
            <Chevron />
          </button>
        </div>
      </div>
    </section>
  )
}
