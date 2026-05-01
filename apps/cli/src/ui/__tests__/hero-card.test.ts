import { describe, it, expect } from "vitest"
import { dim } from "../hero-card.js"

describe("dim", () => {
  it("returns the same color when factor is 0", () => {
    expect(dim("#ff6b8a", 0)).toBe("#ff6b8a")
  })

  it("returns black when factor is 1", () => {
    expect(dim("#ff6b8a", 1)).toBe("#000000")
  })

  it("darkens proportionally at factor 0.5", () => {
    expect(dim("#ffffff", 0.5)).toBe("#808080")
  })

  it("preserves hue when scaling — channels darken together", () => {
    expect(dim("#ff6b8a", 0.5)).toBe("#803645")
  })

  it("works without the leading #", () => {
    expect(dim("ffffff", 0.5)).toBe("#808080")
  })

  it("returns the input unchanged for malformed hex", () => {
    expect(dim("not-a-color", 0.5)).toBe("not-a-color")
    expect(dim("#fff", 0.5)).toBe("#fff") // 3-digit shorthand not supported
  })

  it("pads single-digit hex channels", () => {
    // r=#10 (16) at factor 0.5 → 8 → must come back as "08", not "8"
    expect(dim("#101010", 0.5)).toBe("#080808")
  })
})
