// oklch tokens are converted to hex at the ink boundary because chalk only takes hex named rgb or hsl

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))

// linear srgb to gamma-corrected srgb
const linearToSrgb = (v: number): number =>
  v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055

// oklab to linear srgb (matrix from https://bottosson.github.io/posts/oklab/)
const oklabToLinearRgb = (l: number, a: number, b: number): [number, number, number] => {
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.2914855480 * b) ** 3
  return [
    +4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_,
  ]
}

const toHex2 = (n: number): string => Math.round(clamp01(n) * 255).toString(16).padStart(2, "0")

const OKLCH_RE = /^oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)\s*\)$/i

export const oklchToHex = (input: string): string => {
  const m = input.trim().match(OKLCH_RE)
  if (!m) return input // not oklch so pass through unchanged

  let L = parseFloat(m[1]!)
  const C = parseFloat(m[2]!)
  const h = parseFloat(m[3]!)
  if (Number.isNaN(L) || Number.isNaN(C) || Number.isNaN(h)) return input

  // accept either 0..1 or 0..100 lightness notation
  if (L > 1) L = L / 100

  const hRad = (h * Math.PI) / 180
  const a = C * Math.cos(hRad)
  const b = C * Math.sin(hRad)

  const [r, g, bl] = oklabToLinearRgb(L, a, b)
  const sr = linearToSrgb(r)
  const sg = linearToSrgb(g)
  const sb = linearToSrgb(bl)

  return `#${toHex2(sr)}${toHex2(sg)}${toHex2(sb)}`
}

/**
 * Convert any color string to a chalk-friendly hex.
 * Pass-through for non-oklch strings (named colors, existing hex, etc.).
 * Memoized so repeated renders don't re-do the math.
 */
const cache = new Map<string, string>()
export const toInkColor = (input: string): string => {
  if (!input.startsWith("oklch")) return input
  const hit = cache.get(input)
  if (hit !== undefined) return hit
  const out = oklchToHex(input)
  cache.set(input, out)
  return out
}
