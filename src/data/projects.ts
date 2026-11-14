/*
 * Projects shown in the "Selected work" section, in display order.
 *
 * To show or hide a project: set `hidden`. Hidden projects are not rendered
 * anywhere. Visible ones appear in the index, the counter, the carousel and
 * the mobile list automatically, followed by the "More projects coming soon"
 * slot, which is always last.
 *
 * To give a project photos: drop image files into
 *   src/assets/projects/<slug>/        e.g. src/assets/projects/ibyc/
 * Nothing to list here: every image in that folder is used, sorted by
 * filename (1.jpg, 2.jpg, ... 10.jpg). With more than one they crossfade
 * inside the frame. Camera originals are fine; they are resized at build
 * time. An empty or missing folder shows the dark placeholder card.
 *
 * Empty strings (year, role) and a missing `stats` are simply not rendered.
 * A type of "Event" gets a landscape frame; a type containing "iOS" gets the
 * phone-shaped frame. `placeholder: true` adds the "COMING SOON" tag.
 */
import { photosIn, type Photo } from './photos'

export interface Project {
  /** folder name under src/assets/projects/ and the id used in the page */
  slug: string
  title: string
  /** e.g. "Event", "iOS app", "Machine learning" */
  type: string
  year: string
  role: string
  /** one sentence */
  about: string
  stats?: string[]
  /** true shows the "COMING SOON" tag */
  placeholder: boolean
  /** true keeps the project out of the page entirely */
  hidden?: boolean
}

export const PROJECTS: Project[] = [
  {
    slug: 'ibyc',
    title: 'Indonesian Baptist Youth Conference',
    type: 'Event',
    year: '2023',
    role: 'Head of Event Department',
    about:
      'A three-day national youth conference. I led the ideation, planning, and preparation.',
    stats: ['1,316 participants', '115 committee members', '3 days'],
    placeholder: false,
  },
  {
    slug: 'xray',
    title: 'Chest X-ray Classification',
    type: 'Machine learning',
    year: '',
    role: 'Developer',
    about: 'An image classification model for chest X-rays. Case study coming soon.',
    placeholder: true,
    hidden: true,
  },
  {
    slug: 'app-one',
    title: 'App One',
    type: 'iOS app',
    year: '2023',
    role: '',
    about: 'Built at the Apple Developer Academy. Details coming soon.',
    placeholder: true,
    hidden: true,
  },
  {
    slug: 'app-two',
    title: 'App Two',
    type: 'iOS app',
    year: '2023',
    role: '',
    about: 'Built at the Apple Developer Academy. Details coming soon.',
    placeholder: true,
    hidden: true,
  },
]

/** The projects the page shows, in order. */
export const VISIBLE_PROJECTS = PROJECTS.filter((project) => !project.hidden)

/** A project's photos: every image in src/assets/projects/<slug>/. */
export const photosOf = (project: Project): Photo[] => photosIn(project.slug)
