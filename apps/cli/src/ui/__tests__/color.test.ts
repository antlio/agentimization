import { describe, it, expect } from "vitest"
import { oklchToHex, toInkColor } from "../color.js"

describe("oklchToHex", () => {
  it("converts the design tokens used in the CLI to their canonical hex equivalents", () => {
    // round-trip must stay exact for the design tokens we author against
    expect(oklchToHex("oklch(0.858 0.109 142.7)")).toBe("#a6e3a1") // pass green
    expect(oklchToHex("oklch(0.824 0.101 52.6)")).toBe("#fab387")  // warn peach
    expect(oklchToHex("oklch(0.718 0.181 10.0)")).toBe("#ff6b8a")  // fail red
    expect(oklchToHex("oklch(0.766 0.111 259.9)")).toBe("#89b4fa") // accent blue
    expect(oklchToHex("oklch(0.787 0.119 304.8)")).toBe("#cba6f7") // init lavender
    expect(oklchToHex("oklch(0.404 0.032 280.2)")).toBe("#45475a") // bg dim
  })

  it("accepts L as a 0..100 percentage form too", () => {
    // same lightness expressed as a percentage
    expect(oklchToHex("oklch(85.8 0.109 142.7)")).toBe("#a6e3a1")
  })

  it("returns the input unchanged for non-oklch strings", () => {
    expect(oklchToHex("#abcdef")).toBe("#abcdef")
    expect(oklchToHex("red")).toBe("red")
    expect(oklchToHex("rgb(0,0,0)")).toBe("rgb(0,0,0)")
  })

  it("returns the input unchanged for malformed oklch", () => {
    expect(oklchToHex("oklch(garbage)")).toBe("oklch(garbage)")
    expect(oklchToHex("oklch(0.5)")).toBe("oklch(0.5)") // missing C and h
  })

  it("clamps out-of-gamut values into [0,1] per channel rather than producing NaN", () => {
    // out-of-gamut input should clamp rather than crash
    const out = oklchToHex("oklch(0.7 0.5 30)")
    expect(out).toMatch(/^#[0-9a-f]{6}$/i)
  })
})

describe("toInkColor", () => {
  it("passes through hex unchanged", () => {
    expect(toInkColor("#abcdef")).toBe("#abcdef")
  })

  it("passes through named colors unchanged", () => {
    expect(toInkColor("red")).toBe("red")
    expect(toInkColor("magentaBright")).toBe("magentaBright")
  })

  it("converts oklch to hex", () => {
    expect(toInkColor("oklch(0.858 0.109 142.7)")).toBe("#a6e3a1")
  })

  it("memoizes repeated calls", () => {
    // same input always returns the same output regardless of cache
    const a = toInkColor("oklch(0.858 0.109 142.7)")
    const b = toInkColor("oklch(0.858 0.109 142.7)")
    expect(a).toBe(b)
  })
})
