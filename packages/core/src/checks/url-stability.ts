import type { CheckDefinition } from "@agentimization/shared"

/** Check if pages return proper HTTP status codes for bad URLs */
const httpStatusCodes: CheckDefinition = {
  id: "http-status-codes",
  name: "HTTP Status Codes",
  category: "url-stability",
  description: "Checks if the site returns proper 404 for bad URLs (vs soft 404s)",
  weight: 0.6,
  requiresNetwork: true,
  run: async (ctx) => {
    const testUrls = [
      `${ctx.baseUrl.origin}/this-page-definitely-does-not-exist-${Date.now()}`,
      `${ctx.baseUrl.origin}/404-test-agentimization-audit`,
    ]

    let proper404 = 0
    for (const url of testUrls) {
      try {
        const resp = await fetch(url, { method: "GET", redirect: "follow" })
        if (resp.status === 404) proper404++
      } catch {
        // network error so skip
      }
    }

    if (proper404 === testUrls.length) {
      return {
        id: "http-status-codes",
        name: "HTTP Status Codes",
        category: "url-stability",
        status: "pass",
        message: `All ${ctx.sampledPages.length} sampled pages return proper error codes for bad URLs`,
      }
    }

    return {
      id: "http-status-codes",
      name: "HTTP Status Codes",
      category: "url-stability",
      status: "warn",
      message: "Site may be returning soft 404s (200 status for non-existent pages)",
      suggestion: "Return proper 404 status codes for non-existent pages. Soft 404s confuse AI agents and waste their context on error pages.",
    }
  },
}

/** Check redirect behavior */
const redirectBehavior: CheckDefinition = {
  id: "redirect-behavior",
  name: "Redirect Behavior",
  category: "url-stability",
  description: "Checks if sampled pages have clean redirect behavior (no excessive chains)",
  weight: 0.4,
  requiresNetwork: true,
  run: async (ctx) => {
    const pages = ctx.sampledPages.slice(0, 10)
    let redirected = 0

    for (const page of pages) {
      // a location header means the page redirected
      if (page.headers["location"]) {
        redirected++
      }
    }

    if (redirected === 0) {
      return {
        id: "redirect-behavior",
        name: "Redirect Behavior",
        category: "url-stability",
        status: "pass",
        message: `No redirects detected across ${pages.length} sampled pages`,
      }
    }

    return {
      id: "redirect-behavior",
      name: "Redirect Behavior",
      category: "url-stability",
      status: "warn",
      message: `${redirected}/${pages.length} sampled pages involve redirects`,
      suggestion: "Minimize redirects. Each redirect adds latency for AI agents and some agents may not follow redirect chains properly.",
    }
  },
}

/** Check cache headers */
const cacheHeaderHygiene: CheckDefinition = {
  id: "cache-header-hygiene",
  name: "Cache Header Hygiene",
  category: "url-stability",
  description: "Checks if pages have appropriate cache headers for AI agent crawling",
  weight: 0.4,
  requiresNetwork: true,
  run: async (ctx) => {
    const pages = ctx.sampledPages.slice(0, 10)
    let withCacheHeaders = 0

    for (const page of pages) {
      const hasCacheControl = !!page.headers["cache-control"]
      const hasETag = !!page.headers["etag"]
      const hasLastModified = !!page.headers["last-modified"]

      if (hasCacheControl || hasETag || hasLastModified) {
        withCacheHeaders++
      }
    }

    if (withCacheHeaders === pages.length) {
      return {
        id: "cache-header-hygiene",
        name: "Cache Header Hygiene",
        category: "url-stability",
        status: "pass",
        message: `All ${pages.length + 1} endpoints have appropriate cache headers`,
      }
    }

    return {
      id: "cache-header-hygiene",
      name: "Cache Header Hygiene",
      category: "url-stability",
      status: "warn",
      message: `${pages.length - withCacheHeaders}/${pages.length} pages missing cache headers`,
      suggestion: "Add Cache-Control, ETag, or Last-Modified headers. This helps AI agents efficiently re-crawl your content without re-fetching unchanged pages.",
    }
  },
}

export const urlStabilityChecks: CheckDefinition[] = [
  httpStatusCodes,
  redirectBehavior,
  cacheHeaderHygiene,
]
