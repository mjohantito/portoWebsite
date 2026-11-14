import { useRef, useState, type ComponentType, type ReactNode } from 'react'
import TransitionLink from '../../transition/TransitionLink'
import { InstagramIcon, LinkedInIcon, PersonIcon } from '../Hero/icons'
import ContactForm from './ContactForm'
import { useContactMotion } from './useContactMotion'
import './Contact.css'

interface Card {
  key: string
  /** shown as the big word behind the cards and as the card's label */
  name: string
  handle?: string
  /** external URL, or an internal route when `internal` is set */
  href: string
  internal?: boolean
  image: string
  width: number
  alt: string
  Icon: ComponentType
  /** the About card has no brand mark, so its badge carries text */
  badgeText?: string
}

const CARDS: Card[] = [
  {
    key: 'instagram',
    name: 'Instagram',
    handle: '@manueltito_',
    href: 'https://www.instagram.com/manueltito_/',
    image: 'contact-instagram',
    width: 720,
    alt: 'Manuel in a motorbike helmet at a mountain viewpoint',
    Icon: InstagramIcon,
  },
  {
    key: 'linkedin',
    name: 'LinkedIn',
    handle: 'in/manueltito',
    href: 'https://www.linkedin.com/in/manueltito',
    image: 'contact-linkedin',
    width: 720,
    alt: 'Manuel holding his Apple Developer Academy certificate',
    Icon: LinkedInIcon,
  },
  {
    key: 'about',
    name: 'About me',
    href: '/about',
    internal: true,
    image: 'contact-about',
    width: 804,
    alt: 'Portrait of Manuel Tito',
    Icon: PersonIcon,
    badgeText: 'About me',
  },
]

/* the big word behind the cards: this by default, a card's name while it is hovered or focused */
const DEFAULT_WORD = 'Find me'
const WORDS = [DEFAULT_WORD, ...CARDS.map((card) => card.name)]

const HEADING_MONO = 'Contact'
const HEADING_SERIF = 'me.'

export default function Contact() {
  const rootRef = useRef<HTMLElement>(null)
  const [hot, setHot] = useState<number | null>(null)
  useContactMotion(rootRef)

  const word = hot === null ? 0 : hot + 1

  return (
    <section
      ref={rootRef}
      className="contact"
      id="contact"
      aria-labelledby="contact-heading"
      data-snap
    >
      <h2 className="contact__heading" id="contact-heading" data-contact-heading>
        <span className="visually-hidden">
          {HEADING_MONO} {HEADING_SERIF}
        </span>
        <span aria-hidden="true">
          <span className="contact__mono">
            {Array.from(HEADING_MONO).map((char, i) => (
              <span key={i} className="contact__char-mask">
                <span className="contact__char" data-contact-char>
                  {char}
                </span>
              </span>
            ))}
          </span>{' '}
          <span className="contact__serif" data-contact-serif>
            {HEADING_SERIF}
          </span>
        </span>
      </h2>

      <div className="contact__body">
        <ContactForm />

        <div className="contact__find" data-contact-find>
          <p className="contact__word" aria-hidden="true" data-contact-word>
            {WORDS.map((text, i) => (
              <span
                key={text}
                className="contact__word-item"
                data-state={i === word ? 'active' : i < word ? 'before' : 'after'}
              >
                {text}
              </span>
            ))}
          </p>

          <ul className="contact__cards" data-scroll-x>
            {CARDS.map((card, i) => {
              const label = card.handle ? `${card.name}, ${card.handle}` : card.name
              const shared = {
                className: 'contact__card',
                draggable: false,
                // hover is a mouse thing: a touch never leaves a card "hovered"
                onPointerEnter: (e: { pointerType: string }) =>
                  e.pointerType === 'mouse' && setHot(i),
                onPointerLeave: () => setHot(null),
                onFocus: () => setHot(i),
                onBlur: () => setHot(null),
              }
              const inside: ReactNode = (
                <>
                  <picture>
                    <source
                      type="image/webp"
                      srcSet={`/images/${card.image}-400.webp 400w, /images/${card.image}-${card.width}.webp ${card.width}w`}
                      sizes="(max-width: 900px) 64vw, 16rem"
                    />
                    <img
                      src={`/images/${card.image}-${card.width}.jpg`}
                      width={card.width}
                      height={Math.round(card.width * 1.25)}
                      alt={card.alt}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  </picture>
                  <span
                    className={`contact__badge${card.badgeText ? ' contact__badge--text' : ''}`}
                    aria-hidden="true"
                  >
                    <card.Icon />
                    {card.badgeText}
                  </span>
                </>
              )

              return (
                <li
                  key={card.key}
                  className="contact__item"
                  data-state={hot === null ? 'idle' : hot === i ? 'active' : 'dim'}
                  data-contact-card
                >
                  {card.internal ? (
                    <TransitionLink {...shared} to={card.href} aria-label={label}>
                      {inside}
                    </TransitionLink>
                  ) : (
                    <a
                      {...shared}
                      href={card.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${label} (opens in a new tab)`}
                    >
                      {inside}
                    </a>
                  )}
                  {/* the link above already carries this name */}
                  <p className="contact__card-label" aria-hidden="true">
                    <span>{card.name}</span>
                    {card.handle && <span className="contact__card-handle">{card.handle}</span>}
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
