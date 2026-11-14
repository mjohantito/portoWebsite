// Vite plugin: photos in src/assets/projects/<folder>/ are resized on import.
//
// Dropping a camera original (often 3-4 MB) into one of those folders is all
// it takes: importing it gives { src, srcSet, width, height } pointing at WebP
// copies in a few widths, never larger than the original. The originals are
// never shipped. Uses sharp, which the project already has for `npm run images`.
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import path from 'node:path'

const PHOTO = /\/src\/assets\/projects\/[^?]+\.(jpe?g|png|webp|avif)$/i
const WIDTHS = [480, 960, 1600]
const QUALITY = 78
const DEV_PREFIX = '/@project-photo/'

const render = (file, width) =>
  sharp(file)
    .rotate() // honour EXIF orientation
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer()

export default function projectPhotos() {
  let serving = false
  /** dev only: url -> what to render, and what has been rendered */
  const requests = new Map()
  const rendered = new Map()

  return {
    name: 'project-photos',
    enforce: 'pre',

    configResolved(config) {
      serving = config.command === 'serve'
    },

    async load(id) {
      const file = id.split('?')[0]
      if (!PHOTO.test(file)) return null

      const meta = await sharp(file).metadata()
      // EXIF orientations 5-8 are stored sideways
      const sideways = (meta.orientation ?? 1) >= 5
      const fullWidth = sideways ? meta.height : meta.width
      const fullHeight = sideways ? meta.width : meta.height
      const widths = [...new Set(WIDTHS.map((width) => Math.min(width, fullWidth)))]
      const name = path.basename(file, path.extname(file))

      const urls = []
      for (const width of widths) {
        if (serving) {
          const key = createHash('sha1').update(file).digest('hex').slice(0, 10)
          const url = `${DEV_PREFIX}${key}-${width}.webp`
          requests.set(url, { file, width })
          rendered.delete(url) // the file may have been replaced
          urls.push(url)
        } else {
          const reference = this.emitFile({
            type: 'asset',
            name: `${name}-${width}.webp`,
            source: await render(file, width),
          })
          // Vite swaps this token for the final (hashed) asset URL
          urls.push(`__VITE_ASSET__${reference}__`)
        }
      }

      const largest = widths[widths.length - 1]
      return `export default ${JSON.stringify({
        src: urls[urls.length - 1],
        srcSet: urls.map((url, i) => `${url} ${widths[i]}w`).join(', '),
        width: largest,
        height: Math.round((largest * fullHeight) / fullWidth),
      })}`
    },

    // dev server: render each size the first time it is asked for
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0]
        const request = url && requests.get(url)
        if (!request) return next()
        try {
          if (!rendered.has(url)) rendered.set(url, await render(request.file, request.width))
          res.setHeader('Content-Type', 'image/webp')
          res.setHeader('Cache-Control', 'no-cache')
          res.end(rendered.get(url))
        } catch (error) {
          next(error)
        }
      })
    },
  }
}
