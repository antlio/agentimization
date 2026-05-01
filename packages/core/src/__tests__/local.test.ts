import { describe, it, expect } from "vitest"
import { resolve } from "node:path"
import { buildLocalContext } from "../utils/local.js"
import { DEFAULT_CONFIG } from "@agentimization/shared"

const FIXTURES = resolve(import.meta.dirname, "fixtures")

describe("buildLocalContext", () => {
  it("reads llms.txt, robots.txt, sitemap.xml from good-site", () => {
    const ctx = buildLocalContext(resolve(FIXTURES, "good-site"), { ...DEFAULT_CONFIG })
    expect(ctx.mode).toBe("local")
    expect(ctx.llmsTxt).toContain("# Good Site")
    expect(ctx.robotsTxt).toContain("GPTBot")
    expect(ctx.sitemapXml).toContain("<loc>")
  })

  it("reads AGENTS.md from good-site", () => {
    const ctx = buildLocalContext(resolve(FIXTURES, "good-site"), { ...DEFAULT_CONFIG })
    expect(ctx.agentsMd).toContain("## Build")
    expect(ctx.agentsMd).toContain("## Architecture")
  })

  it("extracts sitemap URLs from sitemap.xml", () => {
    const ctx = buildLocalContext(resolve(FIXTURES, "good-site"), { ...DEFAULT_CONFIG })
    expect(ctx.sitemapUrls.length).toBeGreaterThan(0)
    expect(ctx.sitemapUrls[0]).toContain("good-site.com")
  })

  it("samples HTML and MD files as pages", () => {
    const ctx = buildLocalContext(resolve(FIXTURES, "good-site"), { ...DEFAULT_CONFIG })
    expect(ctx.sampledPages.length).toBeGreaterThan(0)
    // good-site fixture has at least one html sample
    const htmlPage = ctx.sampledPages.find((p) => p.url.endsWith(".html"))
    expect(htmlPage).toBeDefined()
    expect(htmlPage!.statusCode).toBe(200)
  })

  it("returns undefined for missing files in bad-site", () => {
    const ctx = buildLocalContext(resolve(FIXTURES, "bad-site"), { ...DEFAULT_CONFIG })
    expect(ctx.llmsTxt).toBeUndefined()
    expect(ctx.robotsTxt).toBeUndefined()
    expect(ctx.sitemapXml).toBeUndefined()
    expect(ctx.agentsMd).toBeUndefined()
    expect(ctx.mcpServerCard).toBeUndefined()
  })

  it("wraps markdown files as HTML for checks", () => {
    const ctx = buildLocalContext(resolve(FIXTURES, "good-site"), { ...DEFAULT_CONFIG })
    const mdPage = ctx.sampledPages.find((p) => p.url.endsWith(".md"))
    if (mdPage) {
      expect(mdPage.html).toContain("<h1>")
      expect(mdPage.markdown).toBeDefined()
    }
  })
})
