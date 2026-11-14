/**
 * Ambient glow for a project image: the image's own colours, as a soft blob.
 *
 * It is made once per image, from a copy shrunk to a few pixels, so there is
 * no blur filter anywhere: shrinking keeps only the broad colours, and
 * enlarging that in steps smooths them into each other. The result is a 64px
 * canvas that CSS simply stretches behind the image.
 *
 * When the image changes, the old glow dissolves into the new one on that
 * same small canvas.
 */

const GRID = 10 // the image is reduced to GRID x GRID colours
const SIZE = 64
const SATURATION = 1.35

function canvasOf(size: number) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const context = canvas.getContext('2d')
  if (context) context.imageSmoothingQuality = 'high'
  return { canvas, context }
}

/** The finished glow for an image, on its own canvas. Null if the image cannot be read. */
function glowOf(image: HTMLImageElement) {
  const tiny = canvasOf(GRID)
  const glow = canvasOf(SIZE)
  if (!tiny.context || !glow.context) return null

  try {
    tiny.context.drawImage(image, 0, 0, GRID, GRID)

    // slightly richer colour than the photo itself
    const pixels = tiny.context.getImageData(0, 0, GRID, GRID)
    const data = pixels.data
    for (let i = 0; i < data.length; i += 4) {
      const grey = (data[i] + data[i + 1] + data[i + 2]) / 3
      for (let c = 0; c < 3; c++) {
        data[i + c] = Math.max(0, Math.min(255, grey + (data[i + c] - grey) * SATURATION))
      }
    }
    tiny.context.putImageData(pixels, 0, 0)

    // enlarge in steps: each pass smooths the last
    let source = tiny.canvas
    for (const size of [GRID * 2, GRID * 4]) {
      const step = canvasOf(size)
      step.context?.drawImage(source, 0, 0, size, size)
      source = step.canvas
    }
    glow.context.drawImage(source, 0, 0, SIZE, SIZE)

    // fade to nothing toward the edges, so the glow has no outline
    const falloff = glow.context.createRadialGradient(
      SIZE / 2,
      SIZE / 2,
      0,
      SIZE / 2,
      SIZE / 2,
      SIZE / 2,
    )
    falloff.addColorStop(0.15, 'rgba(0, 0, 0, 1)')
    falloff.addColorStop(1, 'rgba(0, 0, 0, 0)')
    glow.context.globalCompositeOperation = 'destination-in'
    glow.context.fillStyle = falloff
    glow.context.fillRect(0, 0, SIZE, SIZE)
    return glow.canvas
  } catch {
    // an image the canvas may not read (cross-origin): no glow
    return null
  }
}

/** canvases that hold a glow, and any dissolve running on them */
const painted = new WeakSet<HTMLCanvasElement>()
const running = new WeakMap<HTMLCanvasElement, number>()

export function stopGlow(target: HTMLCanvasElement) {
  const frame = running.get(target)
  if (frame !== undefined) cancelAnimationFrame(frame)
  running.delete(target)
}

/**
 * Paints `image`'s glow onto `target`. With `dissolve` (milliseconds) and a
 * glow already there, the old one fades into the new one over that time.
 */
export function paintGlow(target: HTMLCanvasElement, image: HTMLImageElement, dissolve = 0) {
  const out = target.getContext('2d')
  const next = glowOf(image)
  if (!out || !next) return
  stopGlow(target)

  const draw = (previous: HTMLCanvasElement | null, mix: number) => {
    out.globalCompositeOperation = 'source-over'
    out.clearRect(0, 0, SIZE, SIZE)
    if (previous) {
      out.globalAlpha = 1 - mix
      out.drawImage(previous, 0, 0)
      out.globalCompositeOperation = 'lighter' // old * (1 - mix) + new * mix
    }
    out.globalAlpha = mix
    out.drawImage(next, 0, 0)
    out.globalAlpha = 1
    out.globalCompositeOperation = 'source-over'
  }

  if (!dissolve || !painted.has(target)) {
    target.width = target.height = SIZE
    draw(null, 1)
    painted.add(target)
    return
  }

  const previous = canvasOf(SIZE)
  previous.context?.drawImage(target, 0, 0)
  const start = performance.now()
  const frame = (now: number) => {
    // a frame's timestamp can be slightly earlier than `start`: never below 0
    const mix = Math.min(Math.max((now - start) / dissolve, 0), 1)
    draw(previous.canvas, mix)
    if (mix < 1) running.set(target, requestAnimationFrame(frame))
    else running.delete(target)
  }
  running.set(target, requestAnimationFrame(frame))
}
