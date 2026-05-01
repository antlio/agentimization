/** Lightweight HTML parsing utilities — no heavy DOM dependencies */

/** Extract text content from HTML, stripping all tags */
export const stripHtml = (html: string): string =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()

/** Extract all links from HTML */
export const extractLinks = (html: string, baseUrl: string): string[] => {
  const links: string[] = []
  const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi
  let match

  while ((match = linkRegex.exec(html)) !== null) {
    try {
      const resolved = new URL(match[1]!, baseUrl).href
      links.push(resolved)
    } catch {
      // skip invalid URLs
    }
  }

  return links
}

/** Extract meta tags from HTML */
export const extractMetaTags = (html: string): Record<string, string> => {
  const meta: Record<string, string> = {}
  const metaRegex = /<meta[^>]+(?:name|property)=["']([^"']+)["'][^>]+content=["']([^"']+)["']/gi
  let match

  while ((match = metaRegex.exec(html)) !== null) {
    meta[match[1]!] = match[2]!
  }

  // also handle the content-then-name attribute order
  const metaRegex2 = /<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']([^"']+)["']/gi
  while ((match = metaRegex2.exec(html)) !== null) {
    meta[match[2]!] = match[1]!
  }

  return meta
}

/** Extract JSON-LD structured data from HTML */
export const extractJsonLd = (html: string): unknown[] => {
  const results: unknown[] = []
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match

  while ((match = regex.exec(html)) !== null) {
    try {
      results.push(JSON.parse(match[1]!))
    } catch {
      // skip invalid JSON-LD
    }
  }

  return results
}

/** Extract heading hierarchy from HTML */
export const extractHeadings = (html: string): Array<{ level: number; text: string }> => {
  const headings: Array<{ level: number; text: string }> = []
  const regex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi
  let match

  while ((match = regex.exec(html)) !== null) {
    headings.push({
      level: parseInt(match[1]!, 10),
      text: stripHtml(match[2]!).trim(),
    })
  }

  return headings
}

/** Check if HTML contains server-rendered content vs client-side only */
export const hasServerRenderedContent = (html: string): boolean => {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")

  const textContent = stripHtml(withoutScripts)
  // ssr pages keep meaningful text once scripts are stripped
  return textContent.length > 100
}

/** Find where the main content starts as a percentage of total HTML */
export const findContentStartPosition = (html: string): number => {
  // common main-content markers
  const markers = [
    /<main[\s>]/i,
    /<article[\s>]/i,
    /id=["']content["']/i,
    /id=["']main["']/i,
    /class=["'][^"']*content[^"']*["']/i,
    /role=["']main["']/i,
  ]

  for (const marker of markers) {
    const match = html.search(marker)
    if (match >= 0) {
      return match / html.length
    }
  }

  // fall back to the first paragraph
  const firstP = html.search(/<p[\s>]/i)
  if (firstP >= 0) {
    return firstP / html.length
  }

  return 0.5 // couldn't determine
}

/** Extract code fences from markdown */
export const extractCodeFences = (markdown: string): Array<{ lang: string; closed: boolean }> => {
  const fences: Array<{ lang: string; closed: boolean }> = []
  const lines = markdown.split("\n")
  let inFence = false
  let currentLang = ""

  for (const line of lines) {
    const openMatch = line.match(/^```(\w*)/)
    if (openMatch && !inFence) {
      inFence = true
      currentLang = openMatch[1] ?? ""
    } else if (line.trim() === "```" && inFence) {
      fences.push({ lang: currentLang, closed: true })
      inFence = false
      currentLang = ""
    }
  }

  // unclosed trailing fence
  if (inFence) {
    fences.push({ lang: currentLang, closed: false })
  }

  return fences
}

/** Parse sitemap XML to extract URLs */
export const parseSitemapUrls = (xml: string): string[] => {
  const urls: string[] = []
  const regex = /<loc>([^<]+)<\/loc>/gi
  let match

  while ((match = regex.exec(xml)) !== null) {
    urls.push(match[1]!.trim())
  }

  return urls
}
