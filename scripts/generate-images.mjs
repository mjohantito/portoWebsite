// Generates responsive image assets into public/images from the originals in
// referenceImage/ (and the EJG backdrop from src/assets/projects/ejg/). Nothing
// is upscaled: widths are capped at the source size.
// Run with: npm run images
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const OUT_DIR = 'public/images'

/**
 * name    output prefix: <name>-<width>.webp, plus a JPEG fallback at the largest width
 * crop    optional region of the source, in source pixels
 * mono    black and white with a small contrast gain (portraits)
 * dim     brightness multiplier for colour photos that sit in dark sections
 * blur    gaussian sigma applied after resizing (pre-blurred backgrounds)
 * jpegOnly  write just <name>.jpg at the largest width (one small file is enough)
 */
const SETS = [
  {
    name: 'portrait', // hero
    src: 'referenceImage/Moody Monochrome Portrait with Glasses.png',
    widths: [560, 840, 1086],
    mono: 1.05,
  },
  {
    name: 'about', // About section card, cropped to head-and-torso so the figure fills it
    src: 'referenceImage/Cinematic Rembrandt Portrait of a Young Man.png',
    // 4:5.4 = the card's 4:5 plus the dolly layer's overscan
    crop: { left: 141, top: 30, width: 804, height: 1085 },
    widths: [480, 804],
    // the studio shot is very low-key; lift it a touch so the shirt keeps some shape
    mono: 1.18,
  },

  // EH! JADI GA? section background. The blur is baked in here, once, at a
  // small size, so the page never runs a blur filter (see `blur` below).
  {
    name: 'ejg-bg',
    src: 'src/assets/projects/ejg/ejg-2.jpg',
    widths: [720],
    blur: 11, // ~24px once the image is stretched across a desktop screen
    quality: 62,
    jpegOnly: true,
  },

  // Contact section cards, cropped to the cards' 4:5
  {
    name: 'contact-instagram',
    src: 'referenceImage/IMG_1046.jpg',
    crop: { left: 0, top: 200, width: 3024, height: 3780 },
    widths: [400, 720],
  },
  {
    name: 'contact-linkedin',
    src: 'referenceImage/IMG_4017 2.jpg',
    crop: { left: 0, top: 120, width: 3024, height: 3780 },
    widths: [400, 720],
  },
  {
    name: 'contact-about',
    src: 'referenceImage/Cinematic Rembrandt Portrait of a Young Man.png',
    crop: { left: 141, top: 30, width: 804, height: 1005 },
    widths: [400, 804],
    mono: 1.18,
  },
]

await mkdir(OUT_DIR, { recursive: true })

for (const { name, src, widths, crop, mono, dim, blur, jpegOnly, quality = 82 } of SETS) {
  let base = sharp(src).rotate() // honour EXIF orientation
  if (crop) base = base.extract(crop)
  // mono: slight contrast lift that keeps blacks matched to the page background
  if (mono) base = base.grayscale().linear(mono, -4)
  if (dim) base = base.modulate({ brightness: dim })

  const sized = (width) => {
    const image = base.clone().resize({ width })
    return blur ? image.blur(blur) : image
  }
  const fallback = Math.max(...widths)

  if (jpegOnly) {
    await sized(fallback).jpeg({ quality, mozjpeg: true }).toFile(path.join(OUT_DIR, `${name}.jpg`))
    console.log(`${name}.jpg`)
    continue
  }

  for (const width of widths) {
    await sized(width)
      .webp({ quality })
      .toFile(path.join(OUT_DIR, `${name}-${width}.webp`))
    console.log(`${name}-${width}.webp`)
  }

  // JPEG fallback for browsers without WebP
  await sized(fallback)
    .jpeg({ quality: Math.min(quality + 2, 84), mozjpeg: true })
    .toFile(path.join(OUT_DIR, `${name}-${fallback}.jpg`))
  console.log(`${name}-${fallback}.jpg`)
}
