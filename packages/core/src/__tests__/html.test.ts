import { describe, it, expect } from "vitest"
import {
  stripHtml,
  extractHeadings,
  extractJsonLd,
  extractCodeFences,
  hasServerRenderedContent,
  findContentStartPosition,
  parseSitemapUrls,
} from "../utils/html.js"

describe("stripHtml", () => {
  it("removes tags and normalizes whitespace", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world")
  })

  it("strips script and style blocks entirely", () => {
    const html = `<p>text</p><script>alert('x')</script><style>.x{}</style><p>more</p>`
    expect(stripHtml(html)).toBe("text more")
  })

  it("handles empty input", () => {
    expect(stripHtml("")).toBe("")
  })
})

describe("extractHeadings", () => {
  it("extracts heading levels and text", () => {
    const html = `<h1>Title</h1><h2>Section</h2><h3>Sub</h3>`
    const headings = extractHeadings(html)
    expect(headings).toEqual([
      { level: 1, text: "Title" },
      { level: 2, text: "Section" },
      { level: 3, text: "Sub" },
    ])
  })

  it("strips nested tags from heading text", () => {
    const html = `<h2><a href="/x">Link Title</a></h2>`
    expect(extractHeadings(html)[0]?.text).toBe("Link Title")
  })
})

describe("extractJsonLd", () => {
  it("parses valid JSON-LD", () => {
    const html = `<script type="application/ld+json">{"@type":"WebSite","name":"Test"}</script>`
    const results = extractJsonLd(html)
    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({ "@type": "WebSite", name: "Test" })
  })

  it("skips invalid JSON-LD silently", () => {
    const html = `<script type="application/ld+json">not json</script>`
    expect(extractJsonLd(html)).toHaveLength(0)
  })

  it("extracts multiple blocks", () => {
    const html = `
      <script type="application/ld+json">{"@type":"A"}</script>
      <script type="application/ld+json">{"@type":"B"}</script>
    `
    expect(extractJsonLd(html)).toHaveLength(2)
  })
})

describe("extractCodeFences", () => {
  it("detects closed fences with language", () => {
    const md = "```typescript\nconst x = 1\n```"
    const fences = extractCodeFences(md)
    expect(fences).toEqual([{ lang: "typescript", closed: true }])
  })

  it("detects unclosed fences", () => {
    const md = "```python\nprint('hello')\n"
    const fences = extractCodeFences(md)
    expect(fences).toEqual([{ lang: "python", closed: false }])
  })

  it("handles multiple fences", () => {
    const md = "```js\na()\n```\n\n```\nb()\n```"
    expect(extractCodeFences(md)).toHaveLength(2)
  })
})

describe("hasServerRenderedContent", () => {
  it("returns true for HTML with substantial text", () => {
    const html = `<main><p>${"Lorem ipsum dolor sit amet. ".repeat(10)}</p></main>`
    expect(hasServerRenderedContent(html)).toBe(true)
  })

  it("returns false for client-only shell", () => {
    const html = `<div id="root"></div><script src="/app.js"></script>`
    expect(hasServerRenderedContent(html)).toBe(false)
  })
})

describe("findContentStartPosition", () => {
  it("finds <main> tag position", () => {
    const html = `${"x".repeat(100)}<main>content</main>`
    const pos = findContentStartPosition(html)
    expect(pos).toBeGreaterThan(0.5) // main starts after halfway
  })

  it("returns 0.5 for unknown structure", () => {
    expect(findContentStartPosition("<div>stuff</div>")).toBe(0.5)
  })
})

describe("parseSitemapUrls", () => {
  it("extracts URLs from sitemap XML", () => {
    const xml = `
      <urlset>
        <url><loc>https://example.com/a</loc></url>
        <url><loc>https://example.com/b</loc></url>
      </urlset>
    `
    expect(parseSitemapUrls(xml)).toEqual([
      "https://example.com/a",
      "https://example.com/b",
    ])
  })

  it("returns empty for no matches", () => {
    expect(parseSitemapUrls("<urlset></urlset>")).toEqual([])
  })
})
