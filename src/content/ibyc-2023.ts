/*
 * IBYC 2023 case study: every word on /projects/ibyc-2023 lives here.
 * Edit freely; the page (src/pages/ProjectIbyc.tsx) only lays it out.
 *
 * Photos come from src/assets/projects/ibyc/story/ (see the README there):
 *   hero.(jpg|jpeg|png|webp)       the top of the page
 *   gallery-1 ... gallery-6        the gallery
 * They are found by filename, so there is nothing to list here.
 */
import type { Photo } from '../data/photos'
import { photosIn } from '../data/photos'

/* ---------- Photos ---------- */

const storyFiles = import.meta.glob<Photo>(
  '../assets/projects/ibyc/story/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}',
  { eager: true, import: 'default' },
)

/** 'gallery-1' -> its photo, or null if that file is not there */
function storyPhoto(name: string): Photo | null {
  const match = Object.entries(storyFiles).find(
    ([path]) => path.split('/').pop()?.replace(/\.[^.]+$/, '').toLowerCase() === name,
  )
  return match ? match[1] : null
}

/** Hero: story/hero, else the first Selected Work photo, else null (dark card). */
export const heroPhoto: Photo | null = storyPhoto('hero') ?? photosIn('ibyc')[0] ?? null

export const GALLERY_SLOTS = 6
export const galleryPhotos: Array<Photo | null> = Array.from({ length: GALLERY_SLOTS }, (_, i) =>
  storyPhoto(`gallery-${i + 1}`),
)

/* ---------- Page ---------- */

export const ibyc2023 = {
  path: '/projects/ibyc-2023',
  /** the browser tab title */
  pageTitle: 'IBYC 2023: All Out | Manuel Tito',
  metaDescription:
    'How I led the event department and directed the show for IBYC 2023, a three-day national youth conference with 1,316 participants.',

  hero: {
    title: 'IBYC 2023: All Out',
    subtitle: 'Indonesian Baptist Youth Conference',
    roles: ['Head of Event Department', 'Show Director (D-Day)'],
    meta: ['29 June – 1 July 2023', 'Graha Unesa, Surabaya', 'On-site'],
    // describe the hero photo if you change it
    heroAlt: 'IBYC 2023, Indonesian Baptist Youth Conference',
  },

  numbers: {
    label: 'In numbers',
    items: [
      { value: 1316, suffix: '', label: 'participants' },
      { value: 115, suffix: '', label: 'committee members' },
      { value: 10, suffix: '+', label: 'speakers' },
      { value: 3, suffix: '', label: 'days' },
    ],
    sponsors:
      'Supported by Ateja, Taman Safari, Postur Clinic, Sango, Sun Star Motor, Somethinc, Amaterasun, CIMB Niaga, and many more.',
    // TODO (optional): sponsor logo files, if you want them shown later
  },

  event: {
    label: 'The event',
    body: 'Organized by Union Indonesian Baptist Church (UIBC). The goal was to gather and connect Baptist youth from all across Indonesia in one place.',
  },

  role: {
    label: 'My role',
    items: [
      {
        title: 'Head of Event Department',
        body: 'I led a team of 4 and owned the concept, the program, and the run-of-show.',
      },
      {
        title: 'Show Director on D-Day',
        body: 'On the day, I coordinated the Stage Manager, Runners, and FOH Manager live.',
      },
    ],
  },

  journey: {
    label: 'The journey',
    // only the first and last steps have dates; the rest are ordered steps
    steps: [
      { date: 'Sept 2022', text: 'Defined the core values we wanted to deliver' },
      { date: null, text: 'Concept development' },
      { date: null, text: 'Program design' },
      { date: null, text: 'Venue planning and survey' },
      { date: null, text: 'Speaker coordination' },
      { date: null, text: 'Detailed run-downs for Stage, Runners, and FOH' },
      { date: null, text: 'Pre-recorded all content needed for the event' },
      { date: null, text: 'Rehearsals' },
      { date: '29 June – 1 July 2023', text: 'D-Day' },
    ] as Array<{ date: string | null; text: string }>,
  },

  challenge: {
    label: 'The challenge',
    statement: 'Coordinating that many people on D-Day.',
    follow: 'The real problem was communication, so I changed how I communicated.',
    // TODO: add one concrete example of how you changed the way you
    // communicated (a sentence or two). It shows under the statement once set.
    challengeExample: null as string | null,
  },

  results: {
    label: 'What I’m proud of',
    items: [
      { highlight: '1,316', text: 'attendees' },
      {
        highlight: null,
        text: 'Being trusted to lead the coordination of a huge event and a 115-person committee',
      },
      {
        highlight: null,
        text: 'A praise-and-worship moment held at Alun-Alun Surabaya, a public landmark',
      },
    ] as Array<{ highlight: string | null; text: string }>,
  },

  learned: {
    label: 'What I learned',
    items: [
      'Communication is key',
      'Emotion regulation is part of communication under pressure',
      'Plan in detail',
    ],
  },

  media: {
    label: 'Media and links',
    video: {
      id: 'WWCKSKAa_Qs',
      title: 'IBYC 2023 recap video',
      url: 'https://youtu.be/WWCKSKAa_Qs',
    },
    links: [
      {
        kicker: 'Official theme song',
        title: 'IBYC 2023 theme song on YouTube',
        url: 'https://www.youtube.com/watch?v=ltsc1R3QyB4',
      },
      {
        kicker: 'Event visual identity by the Publication Department',
        title: 'IBYC 2023 All Out on Behance',
        url: 'https://www.behance.net/gallery/188940949/IBYC-2023-ALL-OUT',
        note: 'Made by the Head of Publication, not by me.',
      },
    ] as Array<{ kicker: string; title: string; url: string; note?: string }>,
    galleryLabel: 'Photos',
    galleryAlt: 'IBYC 2023 photo',
  },

  // TODO: a quote from someone you worked with: { quote: '...', name: '...', role: '...' }.
  // Nothing is shown until it is set.
  testimonial: null as { quote: string; name: string; role: string } | null,

  back: { label: 'Back to projects', section: 'work' },
}
