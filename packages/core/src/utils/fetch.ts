import type { PageSample, AgentimizationConfig } from "@agentimization/shared"
import { DEFAULT_CONFIG } from "@agentimization/shared"

// html-only Accept (no text/markdown) + browser UA so content-negotiating sites
// serve the real rendered HTML instead of the agent markdown variant
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const makeHeaders = (config: AgentimizationConfig, asBrowser = false): Record<string, string> =>
  asBrowser
    ? {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      }
    : {
        "User-Agent": config.userAgent ?? DEFAULT_CONFIG.userAgent,
        Accept: "text/html,application/xhtml+xml,text/markdown,text/plain,*/*",
      }

export const fetchPage = async (
  url: string,
  config: AgentimizationConfig = {},
  asBrowser = false,
): Promise<PageSample> => {
  const timeout = config.timeout ?? DEFAULT_CONFIG.timeout
  const start = Date.now()

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      headers: makeHeaders(config, asBrowser),
      signal: controller.signal,
      redirect: "follow",
    })

    const html = await response.text()
    const headers: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      headers[key] = value
    })

    return {
      url,
      html,
      statusCode: response.status,
      headers,
      fetchTime: Date.now() - start,
    }
  } finally {
    clearTimeout(timer)
  }
}

export const fetchText = async (
  url: string,
  config: AgentimizationConfig = {},
): Promise<{ text: string; statusCode: number; headers: Record<string, string> } | null> => {
  try {
    const result = await fetchPage(url, config)
    return { text: result.html, statusCode: result.statusCode, headers: result.headers }
  } catch {
    return null
  }
}

export const fetchWithContentNegotiation = async (
  url: string,
  accept: string,
  config: AgentimizationConfig = {},
): Promise<{ text: string; statusCode: number; contentType: string } | null> => {
  const timeout = config.timeout ?? DEFAULT_CONFIG.timeout

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": config.userAgent ?? DEFAULT_CONFIG.userAgent,
        Accept: accept,
      },
      signal: controller.signal,
      redirect: "follow",
    })

    const text = await response.text()
    return {
      text,
      statusCode: response.status,
      contentType: response.headers.get("content-type") ?? "",
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Fetch multiple URLs with concurrency control */
export const fetchMany = async (
  urls: string[],
  config: AgentimizationConfig = {},
  asBrowser = false,
): Promise<PageSample[]> => {
  const concurrency = config.concurrency ?? DEFAULT_CONFIG.concurrency
  const results: PageSample[] = []

  for (let i = 0; i < urls.length; i += concurrency) {
    const chunk = urls.slice(i, i + concurrency)
    const chunkResults = await Promise.allSettled(
      chunk.map((url) => fetchPage(url, config, asBrowser)),
    )

    for (const result of chunkResults) {
      if (result.status === "fulfilled") {
        results.push(result.value)
      }
    }
  }

  return results
}
