import { businessBySlug, photosOf } from '../data/businesses'
import type { Photo } from '../data/photos'

/*
 * Which transition each page gets.
 *
 *   zoom   business pages: the business's main photo on the home page grows
 *          until it fills the screen, and is the page's top visual. `key`
 *          names that photo on both pages (data-shared), so each side can be
 *          found and measured.
 *   wipe   every other page: a dark panel passes over the screen.
 *
 * Going back to the home page plays the same transition in reverse.
 */
export type RouteTransition = { variant: 'zoom'; key: string; photo: Photo } | { variant: 'wipe' }

export const HOME = '/'

/** '/work/' and '/work' are the same page */
export const cleanPath = (pathname: string) => pathname.replace(/\/+$/, '') || HOME

export const businessPhotoKey = (slug: string) => `business/${slug}`

export function transitionFor(pathname: string): RouteTransition {
  const slug = cleanPath(pathname).match(/^\/business\/([^/]+)$/)?.[1]
  const business = businessBySlug(slug)
  const photo = business ? photosOf(business)[0] : undefined
  if (business && photo) {
    return { variant: 'zoom', key: businessPhotoKey(business.slug), photo }
  }
  return { variant: 'wipe' }
}
