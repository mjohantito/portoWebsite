import { useRef } from 'react'
import { SOCIAL_LINKS } from '../../data/socials'
import { useAboutMotion } from './useAboutMotion'
import './About.css'

const HEADLINE = 'Building businesses, and the software behind them.'

const PHOTO_SRCSET = '/images/about-480.webp 480w, /images/about-804.webp 804w'
const PHOTO_SIZES = '(max-width: 900px) calc(100vw - 2.5rem), 26rem'

export default function About() {
  const rootRef = useRef<HTMLElement>(null)
  useAboutMotion(rootRef)

  return (
    <section
      ref={rootRef}
      className="about"
      id="about"
      aria-labelledby="about-heading"
      data-snap
    >
      <div className="about__inner">
        <div className="about__media" data-about-media>
          <div className="about__spot" data-about-spot aria-hidden="true" />
          <div className="about__tilt" data-about-tilt>
            <div className="about__card" data-about-card>
              <div className="about__photo-mask" data-about-mask>
                <div className="about__photo" data-about-dolly>
                  <picture>
                    <source type="image/webp" srcSet={PHOTO_SRCSET} sizes={PHOTO_SIZES} />
                    <img
                      src="/images/about-804.jpg"
                      width={804}
                      height={1085}
                      alt="Manuel Tito"
                      loading="lazy"
                      decoding="async"
                      data-about-img
                    />
                  </picture>
                </div>
              </div>
              <div className="about__glare" data-about-glare aria-hidden="true" />
              <div className="about__sheen" data-about-sheen aria-hidden="true" />
            </div>
            <div className="about__edge" aria-hidden="true">
              <div className="about__edge-light" data-about-edge />
            </div>
          </div>
        </div>

        <div className="about__content" data-about-content>
          <p className="about__intro" data-about-fade>
            I&rsquo;m Manuel Tito &mdash; Founder of EH! JADI GA? &amp; Developer
          </p>

          <h2 className="about__headline" id="about-heading">
            {/* Screen readers get the sentence whole; the visual copy is split into lines. */}
            <span className="visually-hidden">{HEADLINE}</span>
            <span className="about__headline-visual" aria-hidden="true" data-about-headline>
              Building <span className="about__accent">businesses</span>, and the{' '}
              <span className="about__accent">software</span> behind them.
            </span>
          </h2>

          <p className="about__body" data-about-lines>
            Based in Indonesia. I&rsquo;m the founder of EH! JADI GA?, a glamping brand serving
            Kediri and Tulungagung. I&rsquo;m also an Information Systems graduate and an Apple
            Developer Academy &rsquo;23 alum, so I build the tools my own business runs on.
          </p>
          <p className="about__body" data-about-lines>
            Before that, I led the event team for a national youth conference with more than 1,300
            participants. Starting a business humbled me, and it keeps teaching me. I write those
            lessons down as I go.
          </p>

          <ul className="about__socials" aria-label="Social profiles">
            {SOCIAL_LINKS.map(({ label, href, Icon }) => {
              const external = href.startsWith('http')
              return (
                <li key={label} data-about-fade>
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
        </div>
      </div>
    </section>
  )
}
