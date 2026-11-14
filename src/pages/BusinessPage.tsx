import { Navigate, useParams } from 'react-router-dom'
import { businessBySlug, photosOf } from '../data/businesses'
import { businessPhotoKey } from '../transition/routes'
import Placeholder from './Placeholder'

/**
 * /business/<slug>: what I do at that business. Not built yet, so it is the
 * placeholder page, with the business's main photo as its top visual (the
 * photo the page transition zooms into). An unknown slug goes home.
 */
export default function BusinessPage() {
  const business = businessBySlug(useParams().slug)
  if (!business) return <Navigate to="/" replace />

  const photo = photosOf(business)[0]

  return (
    <Placeholder
      title={`What I do at ${business.name}`}
      section="business"
      visual={
        photo && {
          photo,
          alt: `${business.photoAlt} 1`,
          key: businessPhotoKey(business.slug),
        }
      }
    />
  )
}
