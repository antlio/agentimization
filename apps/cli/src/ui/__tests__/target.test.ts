import { describe, it, expect } from "vitest"
import { resolveTarget, isLocalPath, normalizeUrl } from "../target.js"
import { resolve } from "node:path"

describe("normalizeUrl", () => {
  it("returns href for fully-formed URLs", () => {
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com/")
  })

  it("prefixes https:// when scheme is missing", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com/")
  })

  it("preserves http:// when explicitly given", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com/")
  })

  it("throws on garbage input", () => {
    expect(() => normalizeUrl(":::not a url:::")).toThrow()
  })
})

describe("isLocalPath", () => {
  it("recognizes . and ..", () => {
    expect(isLocalPath(".")).toBe(true)
    expect(isLocalPath("..")).toBe(true)
  })

  it("recognizes ./ and ../ prefixes", () => {
    expect(isLocalPath("./src")).toBe(true)
    expect(isLocalPath("../foo")).toBe(true)
  })

  it("recognizes absolute paths", () => {
    expect(isLocalPath("/tmp")).toBe(true)
  })

  it("returns false for plain URLs", () => {
    expect(isLocalPath("https://example.com")).toBe(false)
    expect(isLocalPath("example.com")).toBe(false)
  })

  it("returns true for an existing directory passed by name", () => {
    expect(isLocalPath("src")).toBe(true)
  })
})

describe("resolveTarget", () => {
  it("returns an error for empty input", () => {
    const out = resolveTarget("")
    expect(out).toEqual({ error: expect.stringMatching(/enter/i) })
  })

  it("returns an error for whitespace-only input", () => {
    const out = resolveTarget("   ")
    expect(out).toEqual({ error: expect.stringMatching(/enter/i) })
  })

  it("trims surrounding whitespace before resolving", () => {
    const out = resolveTarget("  https://example.com  ")
    expect(out).toEqual({ target: "https://example.com/", isLocal: false })
  })

  it("resolves a URL with no scheme by adding https://", () => {
    expect(resolveTarget("antl.io")).toEqual({
      target: "https://antl.io/",
      isLocal: false,
    })
  })

  it("resolves a relative path to an absolute path with isLocal=true", () => {
    const out = resolveTarget("./src")
    expect(out).toEqual({ target: resolve("./src"), isLocal: true })
  })

  it("resolves an absolute path with isLocal=true", () => {
    const out = resolveTarget("/tmp")
    expect(out).toEqual({ target: "/tmp", isLocal: true })
  })

  it("returns an error for unparseable input", () => {
    const out = resolveTarget(":::not a url or path:::")
    expect(out).toMatchObject({ error: expect.stringContaining("Invalid") })
  })
})
