import { useEffect, useRef, useState } from 'react'
import type { Photo } from '../../data/photos'
import { paintGlow, stopGlow } from './glow'

const CYCLE_MS = 4500
const CROSSFADE_MS = 1400 // matches the image crossfade in Work.css

/**
 * What a project looks like: its photo(s) in a card, or in a phone-shaped
 * frame for iOS apps. With no usable photo it falls back to a dark placeholder
 * (the title in mono for cards, an empty screen for phones).
 *
 * Behind the card sits an ambient glow in the colours of the photo on show
 * (see glow.ts), or a soft amber one when there is no photo.
 *
 * `cycling` crossfades through multiple photos; the parent only turns it on
 * for the active project while the section is on screen.
 */
export default function ProjectMedia({
  title,
  photos,
  phone,
  cycling,
  sharedKey,
}: {
  title: string
  photos: Photo[]
  phone: boolean
  cycling: boolean
  /** names this frame for the page transition to the project's case study */
  sharedKey?: string
}) {
  const [failed, setFailed] = useState<string[]>([])
  const [turn, setTurn] = useState(0)
  const glowRef = useRef<HTMLCanvasElement>(null)
  const shownRef = useRef<HTMLImageElement>(null)

  const images = photos.filter((photo) => !failed.includes(photo.src))
  const shown = images.length ? turn % images.length : 0

  useEffect(() => {
    if (!cycling || images.length < 2) return
    const id = window.setInterval(() => setTurn((t) => t + 1), CYCLE_MS)
    return () => window.clearInterval(id)
  }, [cycling, images.length])

  // the glow follows whichever photo is showing, dissolving along with it
  const paint = (image: HTMLImageElement | null) => {
    if (image && glowRef.current && image.complete && image.naturalWidth) {
      paintGlow(glowRef.current, image, CROSSFADE_MS)
    }
  }
  useEffect(() => paint(shownRef.current), [shown, images.length])
  useEffect(() => {
    const glow = glowRef.current
    return () => {
      if (glow) stopGlow(glow)
    }
  }, [])

  // two wrappers so the scrubbed drift and the timed zoom never share a transform
  const content = (
    <div className="work__drift" data-work-drift>
      <div className="work__zoom" data-work-zoom>
        {images.map((photo, i) => (
          <img
            key={photo.src}
            ref={i === shown ? shownRef : undefined}
            className={i === shown ? 'is-shown' : undefined}
            src={photo.src}
            srcSet={photo.srcSet}
            sizes="(max-width: 900px) 92vw, 44vw"
            // the frame crops with object-fit; this only reserves the box
            width={photo.width}
            height={photo.height}
            alt={images.length > 1 ? `${title}, image ${i + 1} of ${images.length}` : title}
            aria-hidden={i === shown ? undefined : true}
            loading="lazy"
            decoding="async"
            onLoad={(e) => {
              if (e.currentTarget === shownRef.current) paint(e.currentTarget)
            }}
            onError={() => setFailed((list) => [...list, photo.src])}
          />
        ))}
        {images.length === 0 && !phone && (
          <span className="work__placeholder" aria-hidden="true">
            {title}
          </span>
        )}
      </div>
    </div>
  )

  return (
    <>
      {images.length > 0 ? (
        <canvas
          ref={glowRef}
          className="work__glow"
          width={64}
          height={64}
          aria-hidden="true"
          data-work-glow
        />
      ) : (
        <span className="work__glow work__glow--amber" aria-hidden="true" data-work-glow />
      )}

      <div
        className={`work__frame${phone ? ' work__frame--phone' : ''}`}
        data-shared={images.length > 0 ? sharedKey : undefined}
      >
        {phone ? (
          <div className="work__phone">
            <div className="work__screen">{content}</div>
          </div>
        ) : (
          content
        )}

        {images.length > 1 && (
          <div className="work__ticks" aria-hidden="true">
            {images.map((photo, i) => (
              <span key={photo.src} className={i === shown ? 'is-on' : undefined} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

/**
 * The slot after the last project: not a project, just a dark card saying
 * more are on the way. Same layers as a project, so the carousel moves it the
 * same way.
 */
export function SoonCard({ title }: { title: string }) {
  return (
    <>
      <span className="work__glow work__glow--amber" aria-hidden="true" data-work-glow />
      <div className="work__frame work__frame--soon">
        <div className="work__drift" data-work-drift>
          <div className="work__zoom" data-work-zoom>
            <div className="work__soon">
              <p className="work__soon-title">{title}</p>
              <p className="work__soon-note">In progress</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
