import type { CheckDefinition, PageSample } from "@agentimization/shared"
import { extractJsonLd, extractMetaTags, extractLinks, extractHeadings } from "../utils/html.js"

/** Detect common frameworks from headers and HTML hints. Returns the first match, or null. */
type Framework = "next" | "nuxt" | "sveltekit" | "astro" | "remix" | "wordpress"

const detectFramework = (pages: PageSample[]): Framework | null => {
  for (const page of pages) {
    const xpb = (page.headers["x-powered-by"] ?? "").toLowerCase()
    if (xpb.includes("next.js")) return "next"
    if (xpb.includes("nuxt")) return "nuxt"

    const html = page.html
    if (/\/_next\/static\//.test(html) || /<script[^>]+id="__NEXT_DATA__"/.test(html)) return "next"
    if (/__NUXT__\s*=/.test(html) || /\/_nuxt\//.test(html)) return "nuxt"
    if (/data-sveltekit-/.test(html)) return "sveltekit"
    if (/<meta\s+name="generator"\s+content="Astro/i.test(html)) return "astro"
    if (/<meta\s+name="generator"\s+content="WordPress/i.test(html)) return "wordpress"
    if (/\/build\/_assets\/.*\.js/.test(html) && /window\.__remixContext/.test(html)) return "remix"
  }
  return null
}

const FRAMEWORK_DOCS: Record<Framework, string> = {
  next: "https://nextjs.org/docs/app/guides/json-ld",
  nuxt: "https://nuxt.com/modules/schema-org",
  sveltekit: "https://kit.svelte.dev/docs/seo#manual-setup-structured-data",
  astro: "https://docs.astro.build/en/guides/integrations-guide/sitemap/#structured-data",
  remix: "https://remix.run/docs/en/main/route/meta",
  wordpress: "https://yoast.com/structured-data-with-schema-org-the-ultimate-guide/",
}

const frameworkHint = (fw: Framework | null): string => {
  if (fw && FRAMEWORK_DOCS[fw]) return ` See: ${FRAMEWORK_DOCS[fw]}`
  return " See: https://schema.org/docs/gs.html"
}

/** Check for structured data (schema.org / JSON-LD) */
const structuredDataCoverage: CheckDefinition = {
  id: "structured-data-coverage",
  name: "Structured Data Coverage",
  category: "geo-signals",
  description: "Checks for schema.org / JSON-LD structured data on pages",
  weight: 0.8,
  run: async (ctx) => {
    const pages = ctx.sampledPages.slice(0, 10)
    let withStructuredData = 0
    const types: string[] = []

    for (const page of pages) {
      const jsonLd = extractJsonLd(page.html)
      if (jsonLd.length > 0) {
        withStructuredData++
        for (const item of jsonLd) {
          const type = (item as Record<string, unknown>)?.["@type"]
          if (typeof type === "string") types.push(type)
        }
      }
    }

    const uniqueTypes = [...new Set(types)]

    if (withStructuredData === pages.length) {
      return {
        id: "structured-data-coverage",
        name: "Structured Data Coverage",
        category: "geo-signals",
        status: "pass",
        message: `All ${pages.length} pages have structured data. Types: ${uniqueTypes.join(", ") || "detected"}`,
        metadata: { withStructuredData, types: uniqueTypes },
      }
    }

    const fw = detectFramework(pages)

    if (withStructuredData > 0) {
      return {
        id: "structured-data-coverage",
        name: "Structured Data Coverage",
        category: "geo-signals",
        status: "warn",
        message: `${withStructuredData}/${pages.length} pages have structured data${uniqueTypes.length > 0 ? ` (${uniqueTypes.join(", ")})` : ""}`,
        suggestion: `Add JSON-LD structured data (schema.org) to all pages. This helps generative engines understand your content type, authorship, and relationships.${frameworkHint(fw)}`,
        metadata: { withStructuredData, types: uniqueTypes, framework: fw },
      }
    }

    return {
      id: "structured-data-coverage",
      name: "Structured Data Coverage",
      category: "geo-signals",
      status: "fail",
      message: "No structured data (JSON-LD / schema.org) found on any sampled page",
      suggestion: `Add JSON-LD structured data to your pages. At minimum use Article, WebPage, or Organization schema. This is a strong GEO signal — generative engines use it to decide what to cite.${frameworkHint(fw)}`,
      metadata: { framework: fw },
    }
  },
}

/** Check for citation-worthy content signals */
const citationWorthiness: CheckDefinition = {
  id: "citation-worthiness",
  name: "Citation Worthiness",
  category: "geo-signals",
  description: "Checks for content signals that make pages citable by AI (stats, data points, quotes, definitions)",
  weight: 0.7,
  run: async (ctx) => {
    const pages = ctx.sampledPages.slice(0, 10)
    let citablePages = 0

    const signals = {
      withStats: 0,
      withDefinitions: 0,
      withQuotes: 0,
      withLists: 0,
      withTables: 0,
    }

    for (const page of pages) {
      const html = page.html
      let pageCitable = false

      // stats and numbers with context
      if (/\d+%|\d+x|[0-9,]+\s+(users|customers|companies|downloads)/i.test(html)) {
        signals.withStats++
        pageCitable = true
      }

      // definitions
      if (/<dfn|<dt|"is a |"refers to |"means /i.test(html)) {
        signals.withDefinitions++
        pageCitable = true
      }

      // quotes and testimonials
      if (/<blockquote/i.test(html)) {
        signals.withQuotes++
        pageCitable = true
      }

      // tables
      if (/<table[\s\S]*?<\/table>/i.test(html)) {
        signals.withTables++
        pageCitable = true
      }

      // ordered lists (how-to or steps)
      if (/<ol[\s\S]*?<\/ol>/i.test(html)) {
        signals.withLists++
        pageCitable = true
      }

      if (pageCitable) citablePages++
    }

    if (citablePages >= pages.length * 0.7) {
      return {
        id: "citation-worthiness",
        name: "Citation Worthiness",
        category: "geo-signals",
        status: "pass",
        message: `${citablePages}/${pages.length} pages contain citable content (stats, definitions, tables, structured data)`,
        metadata: signals,
      }
    }

    return {
      id: "citation-worthiness",
      name: "Citation Worthiness",
      category: "geo-signals",
      status: citablePages > 0 ? "warn" : "fail",
      message: `Only ${citablePages}/${pages.length} pages contain citable content signals`,
      suggestion: "Add concrete data points, statistics, definitions, and structured information. Generative engines prefer citing content with specific, verifiable claims over vague prose.",
      metadata: signals,
    }
  },
}

/** Check for topical authority signals (internal linking) */
const topicalAuthoritySignals: CheckDefinition = {
  id: "topical-authority-signals",
  name: "Topical Authority Signals",
  category: "geo-signals",
  description: "Checks internal linking depth and content clustering as authority signals",
  weight: 0.6,
  run: async (ctx) => {
    const pages = ctx.sampledPages.slice(0, 10)
    let totalInternalLinks = 0
    let pagesWithGoodLinking = 0

    // file:// urls have origin "null" so use href as the resolution base in local mode
    const resolveBase = ctx.mode === "local" ? ctx.baseUrl.href : ctx.baseUrl.origin

    for (const page of pages) {
      const links = extractLinks(page.html, resolveBase)
      const internalLinks = ctx.mode === "local"
        ? links.filter((l) => l.startsWith("file:"))
        : links.filter((l) => {
            try {
              return new URL(l).origin === ctx.baseUrl.origin
            } catch {
              return false
            }
          })

      totalInternalLinks += internalLinks.length
      if (internalLinks.length >= 3) pagesWithGoodLinking++
    }

    const avgLinks = pages.length > 0 ? Math.round(totalInternalLinks / pages.length) : 0

    if (avgLinks >= 5 && pagesWithGoodLinking >= pages.length * 0.7) {
      return {
        id: "topical-authority-signals",
        name: "Topical Authority Signals",
        category: "geo-signals",
        status: "pass",
        message: `Strong internal linking: avg ${avgLinks} internal links/page, ${pagesWithGoodLinking}/${pages.length} pages well-connected`,
        metadata: { avgLinks, pagesWithGoodLinking },
      }
    }

    return {
      id: "topical-authority-signals",
      name: "Topical Authority Signals",
      category: "geo-signals",
      status: avgLinks >= 2 ? "warn" : "fail",
      message: `Weak internal linking: avg ${avgLinks} internal links/page`,
      suggestion: "Increase internal linking between related pages. Generative engines use link density and clustering to assess topical authority — well-linked content is more likely to be cited.",
      metadata: { avgLinks, pagesWithGoodLinking },
    }
  },
}

/** Check content freshness signals */
const contentFreshness: CheckDefinition = {
  id: "content-freshness",
  name: "Content Freshness",
  category: "geo-signals",
  description: "Checks for date signals (last-modified headers, published dates, updated dates)",
  weight: 0.5,
  run: async (ctx) => {
    const pages = ctx.sampledPages.slice(0, 10)
    let withDateSignals = 0

    for (const page of pages) {
      const hasLastModified = !!page.headers["last-modified"]
      const meta = extractMetaTags(page.html)
      const hasDateMeta =
        !!meta["article:published_time"] ||
        !!meta["article:modified_time"] ||
        !!meta["date"] ||
        !!meta["last-modified"]

      // also accept dates from json-ld
      const jsonLd = extractJsonLd(page.html)
      const hasDateJsonLd = jsonLd.some((item) => {
        const obj = item as Record<string, unknown>
        return !!obj?.datePublished || !!obj?.dateModified
      })

      if (hasLastModified || hasDateMeta || hasDateJsonLd) {
        withDateSignals++
      }
    }

    if (withDateSignals >= pages.length * 0.8) {
      return {
        id: "content-freshness",
        name: "Content Freshness",
        category: "geo-signals",
        status: "pass",
        message: `${withDateSignals}/${pages.length} pages have date/freshness signals`,
        metadata: { withDateSignals },
      }
    }

    return {
      id: "content-freshness",
      name: "Content Freshness",
      category: "geo-signals",
      status: "warn",
      message: `Only ${withDateSignals}/${pages.length} pages have date/freshness signals`,
      suggestion: "Add Last-Modified headers, article:modified_time meta tags, or dateModified in JSON-LD. Generative engines favor fresh content and use date signals to assess relevance.",
      metadata: { withDateSignals },
    }
  },
}

/** Check for E-E-A-T signals (Experience, Expertise, Authoritativeness, Trustworthiness) */
const eeatSignals: CheckDefinition = {
  id: "eeat-signals",
  name: "E-E-A-T Signals",
  category: "geo-signals",
  description: "Checks for author attribution, expertise markers, and trust signals",
  weight: 0.6,
  run: async (ctx) => {
    const pages = ctx.sampledPages.slice(0, 10)
    let withAuthor = 0
    let withExpertise = 0

    for (const page of pages) {
      const meta = extractMetaTags(page.html)
      const jsonLd = extractJsonLd(page.html)

      // author signals
      const hasAuthorMeta = !!meta["author"] || !!meta["article:author"]
      const hasAuthorJsonLd = jsonLd.some((item) => {
        const obj = item as Record<string, unknown>
        return !!obj?.author
      })
      const hasAuthorHtml = /class=["'][^"']*author[^"']*["']|rel=["']author["']/i.test(page.html)

      if (hasAuthorMeta || hasAuthorJsonLd || hasAuthorHtml) withAuthor++

      // expertise markers
      const hasCredentials = /Ph\.?D|M\.?D|CPA|certified|licensed|expert|specialist/i.test(page.html)
      // file:// origin is "null" so use href in local mode
      const linkBase = ctx.mode === "local" ? ctx.baseUrl.href : ctx.baseUrl.origin
      const hasAboutPage = extractLinks(page.html, linkBase).some((l) => /about|team|author/i.test(l))

      if (hasCredentials || hasAboutPage) withExpertise++
    }

    const score = ((withAuthor + withExpertise) / (pages.length * 2))

    if (score >= 0.6) {
      return {
        id: "eeat-signals",
        name: "E-E-A-T Signals",
        category: "geo-signals",
        status: "pass",
        message: `Good E-E-A-T: ${withAuthor}/${pages.length} pages with author attribution, ${withExpertise}/${pages.length} with expertise markers`,
        metadata: { withAuthor, withExpertise },
      }
    }

    return {
      id: "eeat-signals",
      name: "E-E-A-T Signals",
      category: "geo-signals",
      status: score >= 0.3 ? "warn" : "info",
      message: `Weak E-E-A-T: ${withAuthor}/${pages.length} author attributions, ${withExpertise}/${pages.length} expertise markers`,
      suggestion: "Add author names and credentials to content. Link to about/team pages. Generative engines assess source credibility through E-E-A-T signals when deciding what to cite.",
      metadata: { withAuthor, withExpertise },
    }
  },
}

/** Check for FAQ / Q&A schema */
const faqSchema: CheckDefinition = {
  id: "faq-schema",
  name: "FAQ / Q&A Schema",
  category: "geo-signals",
  description: "Checks for FAQ or Q&A structured data — highly cited by generative engines",
  weight: 0.5,
  run: async (ctx) => {
    const pages = ctx.sampledPages.slice(0, 10)
    let withFaq = 0

    for (const page of pages) {
      const jsonLd = extractJsonLd(page.html)
      const hasFaqSchema = jsonLd.some((item) => {
        const type = (item as Record<string, unknown>)?.["@type"]
        return type === "FAQPage" || type === "QAPage"
      })

      // fall back to faq-shaped html when schema is missing
      const hasFaqHtml = /<details|<summary|class=["'][^"']*faq[^"']*["']|id=["'][^"']*faq[^"']*["']/i.test(page.html)

      if (hasFaqSchema || hasFaqHtml) withFaq++
    }

    if (withFaq > 0) {
      return {
        id: "faq-schema",
        name: "FAQ / Q&A Schema",
        category: "geo-signals",
        status: "pass",
        message: `${withFaq}/${pages.length} pages contain FAQ/Q&A content`,
        metadata: { withFaq },
      }
    }

    return {
      id: "faq-schema",
      name: "FAQ / Q&A Schema",
      category: "geo-signals",
      status: "info",
      message: "No FAQ/Q&A schema or FAQ-like content detected",
      suggestion: "Add FAQPage schema or Q&A sections to relevant pages. FAQ-formatted content is heavily cited by generative engines because it directly maps to user questions.",
      metadata: { withFaq },
    }
  },
}

/** Check canonical URL consistency */
const canonicalUrlConsistency: CheckDefinition = {
  id: "canonical-url-consistency",
  name: "Canonical URL Consistency",
  category: "geo-signals",
  description: "Checks if pages have consistent canonical URLs",
  weight: 0.5,
  run: async (ctx) => {
    const pages = ctx.sampledPages.slice(0, 10)
    let withCanonical = 0
    let selfReferencing = 0

    for (const page of pages) {
      const canonicalMatch = page.html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
      if (canonicalMatch) {
        withCanonical++
        try {
          const canonical = new URL(canonicalMatch[1]!, ctx.baseUrl.origin).href
          const pageUrl = new URL(page.url).href
          if (canonical === pageUrl || canonical === pageUrl.replace(/\/$/, "")) {
            selfReferencing++
          }
        } catch {
          // invalid URL
        }
      }
    }

    if (withCanonical === pages.length && selfReferencing === pages.length) {
      return {
        id: "canonical-url-consistency",
        name: "Canonical URL Consistency",
        category: "geo-signals",
        status: "pass",
        message: `All ${pages.length} pages have self-referencing canonical URLs`,
      }
    }

    if (withCanonical === 0) {
      return {
        id: "canonical-url-consistency",
        name: "Canonical URL Consistency",
        category: "geo-signals",
        status: "warn",
        message: "No canonical URLs found on sampled pages",
        suggestion: "Add <link rel=\"canonical\"> to every page. This prevents duplicate content issues when AI agents discover the same page through different URLs.",
      }
    }

    return {
      id: "canonical-url-consistency",
      name: "Canonical URL Consistency",
      category: "geo-signals",
      status: "warn",
      message: `${withCanonical}/${pages.length} pages have canonical URLs (${selfReferencing} self-referencing)`,
      suggestion: "Ensure every page has a self-referencing canonical URL to avoid confusing AI agents about the authoritative version.",
      metadata: { withCanonical, selfReferencing },
    }
  },
}

export const geoSignalChecks: CheckDefinition[] = [
  structuredDataCoverage,
  citationWorthiness,
  topicalAuthoritySignals,
  contentFreshness,
  eeatSignals,
  faqSchema,
  canonicalUrlConsistency,
]
