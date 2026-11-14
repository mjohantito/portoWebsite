/*
 * Photos from src/assets/projects/<folder>/.
 *
 * Every image file in those folders is picked up automatically: add, replace
 * or remove files and the site follows, with no list to edit. Each one is
 * resized at build time (scripts/photo-plugin.mjs), so camera originals are
 * fine to drop in.
 */

export interface Photo {
  /** the largest size */
  src: string
  /** every size, for <img srcset> */
  srcSet: string
  width: number
  height: number
}

const ROOT = 'src/assets/projects/'

const files = import.meta.glob<Photo>(
  '../assets/projects/*/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}',
  { eager: true, import: 'default' },
)

/** 'src/assets/projects/ejg/ejg-1.jpg' -> its photo */
const byPath = new Map(
  Object.entries(files)
    .map(([key, photo]) => [key.replace('../assets/projects/', ROOT), photo] as const)
    // by filename, with numbers in order: 2.jpg comes before 10.jpg
    .sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' })),
)

/** One photo by its path from the project root, or null if the file is not there. */
export const photoAt = (path: string): Photo | null => byPath.get(path) ?? null

/** Every photo in src/assets/projects/<folder>/, sorted by filename. */
export const photosIn = (folder: string): Photo[] =>
  [...byPath].filter(([path]) => path.startsWith(`${ROOT}${folder}/`)).map(([, photo]) => photo)
