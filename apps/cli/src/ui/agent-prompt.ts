import type { AuditResult, CheckResult } from "@agentimization/shared"
import { execSync } from "node:child_process"
import { platform } from "node:os"
import { CATEGORY_LABELS } from "./tokens.js"

interface PromptOptions {
  mode: "remote" | "local"
  target: string
}

const statusMarker = (status: CheckResult["status"]): string => {
  switch (status) {
    case "pass": return "PASS"
    case "warn": return "WARN"
    case "fail": return "FAIL"
    case "skip": return "SKIP"
    case "info": return "INFO"
  }
}

const RATIONALE_LEAD = /^(generative engines|ai (agents|engines|crawlers|search)|this |these |without (it|this)|used by|some agents|blocked agents|missing content|each redirect|citing sources|shorter descriptions|the more context)\b/i

const terseSuggestion = (suggestion: string): string => {
  const sentences = suggestion.split(/(?<=\.)\s+(?=[A-Z])/)
  const kept: string[] = []
  const rescuedUrls: string[] = []
  for (const raw of sentences) {
    const s = raw.trim()
    if (!s) continue
    if (RATIONALE_LEAD.test(s)) {
      const url = s.match(/https?:\/\/\S+/)?.[0]
      if (url && !suggestion.slice(0, suggestion.indexOf(s)).includes(url)) rescuedUrls.push(url.replace(/[.)]+$/, ""))
      continue
    }
    kept.push(s)
  }
  const base = (kept.join(" ") || suggestion).trim()
  return rescuedUrls.length > 0 ? `${base} ${rescuedUrls.join(" ")}` : base
}

const asciiPunct = (s: string): string => s.replace(/[—–]/g, "-").replace(/·/g, "-").replace(/→/g, "->").replace(/;/g, ",")

type Concrete = { success: string }
const SUCCESS_TABLE: Record<string, Concrete | ((m: Record<string, unknown>) => Concrete)> = {
  "llms-txt-exists": { success: "GET /llms.txt returns 200 with an H1, a blockquote summary, and >=1 ## link section." },
  "sitemap-exists": { success: "GET /sitemap.xml returns 200 valid XML listing all public pages." },
  "markdown-url-support": (m) => ({ success: `appending .md to each page URL returns 200 text/markdown (now ${m.supported ?? 0}/${m.total ?? "?"}).` }),
  "structured-data-coverage": { success: "every sampled page has a valid schema.org JSON-LD block." },
  "topical-authority-signals": (m) => ({ success: `avg >=5 internal links/page and >=70% of pages have >=3 (now avg ${m.avgLinks ?? 0}/page).` }),
  "content-freshness": { success: ">=80% of pages expose a machine-readable date (Last-Modified, meta, or JSON-LD)." },
  "eeat-signals": { success: "each content page names an author with credentials and links to an about/team page." },
  "canonical-url-consistency": { success: "every page has a self-referencing <link rel=\"canonical\">." },
  "mcp-server-card": { success: "GET /.well-known/mcp/server-card.json returns valid JSON with name + description + >=1 tool." },
  "section-header-quality": { success: "every page has exactly one H1 and no skipped heading levels." },
}

const resolveSuccess = (issue: CheckResult): string | undefined => {
  const entry = SUCCESS_TABLE[issue.id]
  if (!entry) return undefined
  return (typeof entry === "function" ? entry(issue.metadata ?? {}) : entry).success
}

/** Build the issues-only section (used by both full report and clipboard) */
const buildIssuesBlock = (result: AuditResult, opts: PromptOptions, terse = false): string[] => {
  const failures = result.checks.filter((c) => c.status === "fail")
  const warnings = result.checks.filter((c) => c.status === "warn")
  const issues = [...failures, ...warnings]
  const lines: string[] = []

  if (issues.length === 0) {
    lines.push(`All checks passed! No fixes needed.`)
    return lines
  }

  if (!terse) {
    lines.push(`Fix the following GEO issues to make this ${opts.mode === "local" ? "project" : "website"} more discoverable by AI agents:`)
    lines.push(``)
  }

  const byCategory = new Map<string, CheckResult[]>()
  for (const issue of issues) {
    const existing = byCategory.get(issue.category) ?? []
    existing.push(issue)
    byCategory.set(issue.category, existing)
  }

  for (const [cat, catIssues] of byCategory) {
    const label = CATEGORY_LABELS[cat] ?? cat
    const catScore = result.categories[cat]?.score ?? "?"
    lines.push(terse ? label : `### ${label} (${catScore}/100)`)
    lines.push(``)

    for (const issue of catIssues) {
      if (terse) {
        lines.push(`- ${issue.id} (${statusMarker(issue.status)}): ${asciiPunct(issue.message)}`)
        if (issue.suggestion) lines.push(`  -> ${asciiPunct(terseSuggestion(issue.suggestion))}`)
        continue
      }
      lines.push(`- ${statusMarker(issue.status)} **${issue.id}**: ${issue.message}`)
      if (issue.suggestion) lines.push(`  - **Fix:** ${issue.suggestion}`)
      const success = resolveSuccess(issue)
      if (success) lines.push(`  - **Success:** ${success}`)
    }

    lines.push(``)
  }

  return lines
}

/** Generate a concise fix prompt for clipboard — only the broken stuff */
export const generateClipboardPrompt = (result: AuditResult, opts: PromptOptions): string => {
  const lines: string[] = []

  const subject = opts.mode === "local" ? "project" : "website"
  lines.push(`Fix these GEO issues on ${opts.target} so AI agents can discover this ${subject}. Fixes are grouped by area. Do FAIL before WARN.`)
  lines.push(``)

  lines.push(...buildIssuesBlock(result, opts, true))

  if (opts.mode === "local") {
    lines.push(`Files are at \`${opts.target}\`. Fix the issues above, then re-run \`agentimization ${opts.target}\` to verify.`)
  }

  return lines.join("\n")
}

/** Generate a full markdown report (for --md output) */
export const generateAgentPrompt = (result: AuditResult, opts: PromptOptions): string => {
  const lines: string[] = []

  lines.push(`# Agentimization GEO Audit Report`)
  lines.push(``)
  lines.push(`**Target:** ${opts.target}`)
  lines.push(`**Mode:** ${opts.mode}`)
  lines.push(`**Grade:** ${result.grade} (${result.overall_score}/100)`)
  lines.push(`**Summary:** ${result.summary.passed} passed, ${result.summary.warned} warnings, ${result.summary.failed} failed, ${result.summary.skipped} skipped`)
  lines.push(``)

  lines.push(`## Issues to Fix`)
  lines.push(``)
  lines.push(...buildIssuesBlock(result, opts))

  // list the passing checks so the agent does not regress them
  const passes = result.checks.filter((c) => c.status === "pass")
  if (passes.length > 0) {
    lines.push(`## Already Passing`)
    lines.push(``)
    lines.push(`These checks are already good (don't break them while fixing the issues above):`)
    lines.push(``)
    for (const pass of passes) {
      lines.push(`- PASS **${pass.id}**: ${pass.message}`)
    }
    lines.push(``)
  }

  lines.push(`## Instructions`)
  lines.push(``)

  if (opts.mode === "local") {
    lines.push(`This is a local directory audit. The files are at \`${opts.target}\`.`)
    lines.push(`Please fix the issues above by editing the relevant files directly.`)
    lines.push(`After fixing, I can re-run \`agentimization ${opts.target}\` to verify.`)
  } else {
    lines.push(`This is a remote site audit of ${opts.target}.`)
    lines.push(`Please suggest the specific code changes needed to fix each issue.`)
    lines.push(`Prioritize FAIL over WARN.`)
  }

  lines.push(``)
  lines.push(`Focus on the highest-impact fixes first. The goal is to maximize the GEO score so AI agents can discover, parse, and cite this content effectively.`)

  return lines.join("\n")
}

/** Try to copy text to the system clipboard */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    const os = platform()

    if (os === "darwin") {
      execSync("pbcopy", { input: text })
      return true
    }

    if (os === "linux") {
      // try xclip then xsel then wl-copy
      const stdio: ["pipe", "pipe", "pipe"] = ["pipe", "pipe", "pipe"]
      try {
        execSync("xclip -selection clipboard", { input: text, stdio })
        return true
      } catch {
        try {
          execSync("xsel --clipboard --input", { input: text, stdio })
          return true
        } catch {
          try {
            execSync("wl-copy", { input: text, stdio })
            return true
          } catch {
            return false
          }
        }
      }
    }

    if (os === "win32") {
      execSync("clip", { input: text })
      return true
    }

    return false
  } catch {
    return false
  }
}
