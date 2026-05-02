import { readFileSync, readdirSync, statSync, existsSync } from "node:fs"
import { dirname, join, relative, extname } from "node:path"
import type { AuditContext, PageSample, AgentimizationConfig } from "@agentimization/shared"
import { parseSitemapUrls } from "./html.js"

/** Read a file if it exists, return undefined otherwise */
const readIfExists = (path: string): string | undefined => {
  try {
    if (existsSync(path)) {
      return readFileSync(path, "utf-8")
    }
  } catch {
    // skip
  }
  return undefined
}

/** walk up from start looking for any of the given filenames, stop at the filesystem root */
const findUpward = (start: string, names: string[], maxDepth = 6): string | undefined => {
  let current = start
  for (let i = 0; i < maxDepth; i++) {
    for (const name of names) {
      const candidate = join(current, name)
      const value = readIfExists(candidate)
      if (value !== undefined) return value
    }
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }
  return undefined
}

/** Recursively collect files matching given extensions */
const walkDir = (dir: string, extensions: Set<string>, maxDepth = 10): string[] => {
  if (maxDepth <= 0) return []

  const results: string[] = []

  try {
    const entries = readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)

      // skip hidden dirs and common build output
      if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "dist") {
        continue
      }

      if (entry.isDirectory()) {
        results.push(...walkDir(fullPath, extensions, maxDepth - 1))
      } else if (entry.isFile() && extensions.has(extname(entry.name).toLowerCase())) {
        results.push(fullPath)
      }
    }
  } catch {
    // any fs error means we just skip the dir
  }

  return results
}

/** Build an AuditContext from a local directory */
export const buildLocalContext = (
  dirPath: string,
  config: Required<AgentimizationConfig>,
): AuditContext => {
  const baseUrl = new URL(`file://${dirPath}`)

  const robotsTxt = readIfExists(join(dirPath, "robots.txt"))
  const llmsTxt = readIfExists(join(dirPath, "llms.txt"))
  const llmsFullTxt = readIfExists(join(dirPath, "llms-full.txt"))
  const sitemapXml = readIfExists(join(dirPath, "sitemap.xml"))

  const mcpServerCard = readIfExists(join(dirPath, ".well-known", "mcp", "server-card.json"))
  const apiCatalog = readIfExists(join(dirPath, ".well-known", "api-catalog"))
  const agentSkillsIndex = readIfExists(join(dirPath, ".well-known", "agent-skills", "index.json"))

  // walk up so auditing a build dir (like dist/) still finds the repo-root agents.md
  const agentsMd = findUpward(dirPath, ["AGENTS.md", "AGENT.md"])

  const sitemapUrls = sitemapXml ? parseSitemapUrls(sitemapXml) : []

  // robots.txt can point at a non-default sitemap location
  if (!sitemapXml && robotsTxt) {
    const sitemapMatch = robotsTxt.match(/Sitemap:\s*(.+)/i)
    if (sitemapMatch) {
      const sitemapPath = sitemapMatch[1]!.trim()
      const localSitemapPath = sitemapPath.startsWith("http")
        ? null
        : join(dirPath, sitemapPath.replace(/^\//, ""))
      if (localSitemapPath) {
        const altSitemap = readIfExists(localSitemapPath)
        if (altSitemap) {
          sitemapUrls.push(...parseSitemapUrls(altSitemap))
        }
      }
    }
  }

  const htmlFiles = walkDir(dirPath, new Set([".html", ".htm"]))
  const mdFiles = walkDir(dirPath, new Set([".md", ".mdx"]))

  // sample html when it exists, fall back to md for markdown-only repos
  // markdown files that mirror html pages must not be sampled as separate
  // pages or html-shaped checks (canonical, json-ld, content-start) misfire
  const sampleSource = htmlFiles.length > 0 ? htmlFiles : mdFiles
  const sampled = sampleSource.slice(0, config.sampleSize)

  const sampledPages: PageSample[] = sampled.map((filePath) => {
    const content = readFileSync(filePath, "utf-8")
    const relPath = relative(dirPath, filePath)
    const ext = extname(filePath).toLowerCase()
    const isMarkdown = ext === ".md" || ext === ".mdx"
    const url = `file://${filePath}`

    return {
      url,
      html: isMarkdown ? wrapMarkdownAsHtml(content, relPath) : content,
      statusCode: 200,
      headers: {},
      markdown: isMarkdown ? content : undefined,
      fetchTime: 0,
    }
  })

  return {
    mode: "local",
    targetUrl: dirPath,
    baseUrl,
    sitemapUrls,
    sampledPages,
    robotsTxt,
    llmsTxt,
    llmsFullTxt,
    sitemapXml,
    allUrls: sampled.map((f) => `file://${f}`),
    mcpServerCard,
    apiCatalog,
    agentSkillsIndex,
    agentsMd,
  }
}

/** Wrap markdown content in minimal HTML for checks that expect HTML */
const wrapMarkdownAsHtml = (md: string, title: string): string => {
  // a tiny markdown to html shim so html-only checks can still inspect markdown sources
  let html = md

  html = html.replace(/^#{6}\s+(.+)$/gm, "<h6>$1</h6>")
  html = html.replace(/^#{5}\s+(.+)$/gm, "<h5>$1</h5>")
  html = html.replace(/^#{4}\s+(.+)$/gm, "<h4>$1</h4>")
  html = html.replace(/^#{3}\s+(.+)$/gm, "<h3>$1</h3>")
  html = html.replace(/^#{2}\s+(.+)$/gm, "<h2>$1</h2>")
  html = html.replace(/^#{1}\s+(.+)$/gm, "<h1>$1</h1>")

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  html = html.replace(/^>\s+(.+)$/gm, "<blockquote>$1</blockquote>")
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>")
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  html = html.replace(/^[-*]\s+(.+)$/gm, "<li>$1</li>")
  html = html.replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")
  // wrap any line that is still bare text in a paragraph
  html = html.replace(/^([^<\n].+)$/gm, "<p>$1</p>")

  return `<!DOCTYPE html><html><head><title>${title}</title></head><body><main>${html}</main></body></html>`
}
