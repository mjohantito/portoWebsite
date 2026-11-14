/*
 * Businesses shown in the "My business" carousel, in display order.
 *
 * To add one: append an entry below. Its card appears before the empty
 * "next venture" slot automatically.
 *   - logo.svg is inline SVG markup. Use `currentColor` for its fills so the
 *     card can colour it.
 *   - backgroundImage must already be blurred: add a set with `blur` to
 *     scripts/generate-images.mjs and run `npm run images`. The page never
 *     blurs anything itself.
 *   - photos are the sharp pictures inside the card. Put the files in
 *     src/assets/projects/<folder>/ and list their paths here; the first one
 *     is the large main photo, and up to three more sit beside it. Camera
 *     originals are fine: they are resized at build time. A path whose file is
 *     missing is skipped, and with no photos the card shows placeholder blocks.
 *   - instagram is optional; without it the card has no Instagram button.
 *   - accent colours the primary button, the dots and the location markers.
 */
// The EJG mark exactly as supplied (referenceImage/Group 8891.svg). Only its
// colour changes: the brand yellow becomes currentColor.
import ejgMark from '../assets/ejg-mark.svg?raw'
import { photoAt, type Photo } from './photos'

export interface Business {
  /** used in the URL of its detail page: /business/<slug> */
  slug: string
  name: string
  /** short form for buttons, e.g. "What I do at EJG" */
  shortName: string
  logo: { svg: string; alt: string }
  tagline: string
  description: string
  locations: { label: string; places: string[] }
  role: string
  website: { label: string; url: string }
  /** optional: adds an Instagram button to the card */
  instagram?: { handle: string; url: string }
  /** public path to a pre-blurred image */
  backgroundImage: string
  /** paths from the project root; the first is the main photo */
  photos: string[]
  /** alt text for the photos; each gets its number added ("... 1", "... 2") */
  photoAlt: string
  accent: string
}

export const BUSINESSES: Business[] = [
  {
    slug: 'ehjadiga',
    name: 'EH! JADI GA?',
    shortName: 'EJG',
    logo: { svg: ejgMark.replaceAll('#F3D543', 'currentColor'), alt: 'EH! JADI GA? logo' },
    tagline: 'Hey, are we going or not?',
    description: 'A glamping brand for people who keep saying ‘we should go sometime’.',
    locations: { label: 'Serving two cities in East Java', places: ['Kediri', 'Tulungagung'] },
    role: 'Founder',
    website: { label: 'ehjadiga.com', url: 'https://ehjadiga.com' },
    instagram: { handle: '@ehjadiga', url: 'https://www.instagram.com/ehjadiga/' },
    backgroundImage: '/images/ejg-bg.jpg',
    photos: [
      'src/assets/projects/ejg/ejg-2.jpg', // main: the tent at dusk
      'src/assets/projects/ejg/ejg-1.jpg',
      'src/assets/projects/ejg/ejg-4.jpg',
      'src/assets/projects/ejg/ejg-3.jpg',
    ],
    photoAlt: 'EH! JADI GA? glamping',
    accent: '#F3D543',
  },
]

/** A business's photos that actually exist, in the order listed. */
export const photosOf = (business: Business): Photo[] =>
  business.photos.map(photoAt).filter((photo): photo is Photo => photo !== null)

export const businessBySlug = (slug: string | undefined) =>
  BUSINESSES.find((business) => business.slug === slug) ?? null
