import { useRef, useState, type CSSProperties } from 'react'
import { VISIBLE_PROJECTS, photosOf } from '../../data/projects'
import { projectPhotoKey } from '../../transition/routes'
import TransitionLink from '../../transition/TransitionLink'
import ProjectMedia, { SoonCard } from './ProjectMedia'
import { useWorkMotion } from './useWorkMotion'
import './Work.css'

/* Hidden projects never reach this file. After the visible ones comes one
   more stop that is not a project: the "coming soon" slot, always last. */
const PROJECTS = VISIBLE_PROJECTS.map((project) => ({
  ...project,
  photos: photosOf(project),
  phone: project.type.toLowerCase().includes('ios'),
  // event photos are mostly landscape
  landscape: project.type.toLowerCase() === 'event',
}))
const SOON = PROJECTS.length // the slot's position
const STOPS = PROJECTS.length + 1
const SOON_TITLE = 'More projects coming soon'

const pad = (n: number) => String(n).padStart(2, '0')

/** Keeps hyphenated words ("X-ray") on one line when a title wraps. */
function Title({ text }: { text: string }) {
  return text.split(' ').map((word, i) => (
    <span key={i}>
      {i > 0 && ' '}
      {word.includes('-') ? <span className="work__nowrap">{word}</span> : word}
    </span>
  ))
}

/**
 * The primary action of a project with a case study. One copy sits in each
 * project card (small screens, reduced motion) and one in the left panel
 * (desktop); CSS shows the one that belongs to the layout.
 */
function ReadMore({ to, place }: { to: string; place: 'card' | 'panel' }) {
  return (
    <TransitionLink className={`work__more work__more--${place}`} to={to}>
      <span className="work__more-long">Read more about this project</span>
      <span className="work__more-short">Read more</span>
      <span className="work__more-arrow" aria-hidden="true">
        &rarr;
      </span>
    </TransitionLink>
  )
}

/** One hairline per panel, drawn as SVG so it can be traced on entry. */
function PanelBorder() {
  return (
    <svg className="work__panel-border" focusable="false">
      <rect width="100%" height="100%" rx="11.5" pathLength={1} data-work-border />
    </svg>
  )
}

/**
 * Selected work. One set of <article>s serves three layouts (see Work.css):
 *   - desktop: two pinned panels; each scroll gesture (or arrow key) moves one
 *     stop (a project, or the coming-soon slot), because each is a stop for
 *     the page's snap controller
 *   - below 900px: a plain vertical list, text over each image
 *   - reduced motion on desktop: a two-column list
 * Each project's text exists once in the DOM, inside its article; on desktop
 * the left panel is simply where the active article's text is displayed.
 */
export default function Work() {
  const rootRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  const [entered, setEntered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [live, setLive] = useState(false)

  // undefined on the coming-soon slot
  const activeProject = PROJECTS[active] as (typeof PROJECTS)[number] | undefined

  const go = useWorkMotion(rootRef, STOPS, { setActive, setEntered, setPinned, setLive })

  // a peek image stops being a button once its project is active, so hand
  // focus to that project's index number
  const jump = (i: number) => {
    go(i)
    rootRef.current
      ?.querySelectorAll<HTMLButtonElement>('[data-work-index]')
      [i]?.focus({ preventScroll: true })
  }

  return (
    <section
      ref={rootRef}
      className="work"
      id="work"
      aria-labelledby="work-heading"
      data-entered={entered}
      data-snap
    >
      <div className="work__pin" data-work-pin data-fall-root>
        <div className="work__panel work__panel--left" data-work-panel aria-hidden="true">
          <PanelBorder />
        </div>
        <div className="work__panel work__panel--right" data-work-panel aria-hidden="true">
          <PanelBorder />
        </div>

        <h2 className="work__label work__label--top" id="work-heading">
          Selected work
        </h2>

        {/* numbered index with lines that converge on the active title (desktop) */}
        <nav className="work__index" aria-label="Projects">
          <svg className="work__lines" focusable="false" aria-hidden="true" data-work-lines>
            {Array.from({ length: STOPS }, (_, i) => (
              <path
                key={i}
                className={i === active ? 'is-active' : undefined}
                pathLength={1}
                data-work-line
              />
            ))}
          </svg>
          <ol style={{ '--active': active } as CSSProperties}>
            {PROJECTS.map((project, i) => (
              <li key={project.slug}>
                <button
                  type="button"
                  aria-current={i === active ? 'true' : undefined}
                  aria-label={`Project ${i + 1} of ${PROJECTS.length}: ${project.title}`}
                  data-work-index
                  onClick={() => go(i)}
                >
                  {pad(i + 1)}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                aria-current={active === SOON ? 'true' : undefined}
                aria-label={SOON_TITLE}
                data-work-index
                onClick={() => go(SOON)}
              >
                +
              </button>
            </li>
          </ol>
        </nav>

        <div className="work__list">
          {PROJECTS.map((project, i) => {
            const titleId = `work-${project.slug}-title`
            const state = !entered || i > active ? 'after' : i < active ? 'before' : 'active'
            const hasFacts = Boolean(project.role || project.stats?.length)

            return (
              <article
                key={project.slug}
                className={`work__item${project.landscape ? ' work__item--landscape' : ''}`}
                aria-labelledby={titleId}
                data-state={state}
                data-work-item
              >
                <div className="work__info">
                  <div className="work__head">
                    <p className="work__meta work__roll">
                      <span className="work__roll-inner">
                        <span>{project.type}</span>
                        {project.year && <span>{project.year}</span>}
                        {project.placeholder && <span className="work__tag">Coming soon</span>}
                      </span>
                    </p>
                    <h3 className="work__title work__roll" id={titleId}>
                      <span className="work__roll-inner">
                        <Title text={project.title} />
                      </span>
                    </h3>
                    <p className="work__about work__roll">
                      <span className="work__roll-inner">{project.about}</span>
                    </p>
                  </div>

                  {hasFacts && (
                    <div className="work__facts work__roll">
                      <div className="work__roll-inner">
                        {project.role && (
                          <p className="work__role">
                            <span className="work__fact-label">Role</span>
                            {project.role}
                          </p>
                        )}
                        {project.stats && project.stats.length > 0 && (
                          <ul className="work__stats">
                            {project.stats.map((stat) => (
                              <li key={stat}>{stat}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}

                  {project.detailsUrl && <ReadMore to={project.detailsUrl} place="card" />}
                </div>

                <div className="work__stage" data-work-stage>
                  {/* decorative: the same number and year are in the text above */}
                  <span className="work__num" aria-hidden="true">
                    {pad(i + 1)}
                  </span>
                  {project.year && (
                    <span className="work__year" aria-hidden="true">
                      {project.year}
                    </span>
                  )}

                  <div className="work__slot" data-work-slot>
                    <ProjectMedia
                      title={project.title}
                      photos={project.photos}
                      phone={project.phone}
                      cycling={pinned && live && i === active}
                      sharedKey={project.detailsUrl ? projectPhotoKey(project.slug) : undefined}
                    />
                    {/* the peeking neighbours are buttons that jump to their project */}
                    <button
                      type="button"
                      className="work__jump"
                      hidden={!pinned || Math.abs(i - active) !== 1}
                      aria-label={`Show project ${i + 1} of ${PROJECTS.length}: ${project.title}`}
                      onClick={() => jump(i)}
                    />
                  </div>
                </div>
              </article>
            )
          })}

          {/* the coming-soon slot: the card carries the words; the copy of them
              in the left panel (desktop) is for the eye only */}
          <div
            className="work__item work__item--soon"
            data-state={!entered || SOON > active ? 'after' : 'active'}
            data-work-item
          >
            <div className="work__info" aria-hidden="true">
              <div className="work__head">
                <p className="work__title work__roll">
                  <span className="work__roll-inner">{SOON_TITLE}</span>
                </p>
              </div>
            </div>

            <div className="work__stage" data-work-stage>
              <span className="work__num" aria-hidden="true">
                +
              </span>
              <div className="work__slot" data-work-slot>
                <SoonCard title={SOON_TITLE} />
                <button
                  type="button"
                  className="work__jump"
                  hidden={!pinned || Math.abs(SOON - active) !== 1}
                  aria-label={`Show: ${SOON_TITLE}`}
                  onClick={() => jump(SOON)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* desktop: the active project's case study (if any), then all work */}
        <div className="work__actions">
          {activeProject?.detailsUrl && (
            <ReadMore key={activeProject.slug} to={activeProject.detailsUrl} place="panel" />
          )}
          <TransitionLink className="work__all" to="/work">
            View all work
            <span className="work__all-arrow" aria-hidden="true">
              &rarr;
            </span>
          </TransitionLink>
        </div>

        <p className="work__label work__label--bl" aria-hidden="true">
          Scroll
        </p>
        <p className="work__label work__label--br" aria-hidden="true">
          {/* "01 / 01" on a project, "SOON" on the slot */}
          <span className="work__counter">
            <span
              className="work__counter-reel"
              style={{ transform: `translateY(${(-active * 100) / STOPS}%)` }}
            >
              {PROJECTS.map((project, i) => (
                <span key={project.slug}>{`${pad(i + 1)} / ${pad(PROJECTS.length)}`}</span>
              ))}
              <span>Soon</span>
            </span>
          </span>
        </p>
      </div>
    </section>
  )
}
