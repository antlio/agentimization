import type { AuditResult, CheckResult } from "@agentimization/shared"
import { execSync } from "node:child_process"
import { platform } from "node:os"

interface PromptOptions {
  mode: "remote" | "local"
  target: string
}

const CATEGORY_LABELS: Record<string, string> = {
  "content-discoverability": "Content Discoverability",
  "markdown-availability": "Markdown Availability",
  "content-structure": "Content Structure",
  "page-size": "Page Size & Rendering",
  "url-stability": "URL Stability",
  "authentication": "Authentication & Access",
  "geo-signals": "GEO Signals",
  "agent-protocols": "Agent Protocols",
}

const statusEmoji = (status: CheckResult["status"]): string => {
  switch (status) {
    case "pass": return "✅"
    case "warn": return "⚠️"
    case "fail": return "❌"
    case "skip": return "⏭️"
    case "info": return "ℹ️"
  }
}

/** Build the issues-only section (used by both full report and clipboard) */
const buildIssuesBlock = (result: AuditResult, opts: PromptOptions): string[] => {
  const failures = result.checks.filter((c) => c.status === "fail")
  const warnings = result.checks.filter((c) => c.status === "warn")
  const issues = [...failures, ...warnings]
  const lines: string[] = []

  if (issues.length === 0) {
    lines.push(`All checks passed! No fixes needed.`)
    return lines
  }

  lines.push(`Fix the following GEO issues to make this ${opts.mode === "local" ? "project" : "website"} more discoverable by AI agents:`)
  lines.push(``)

  const byCategory = new Map<string, CheckResult[]>()
  for (const issue of issues) {
    const existing = byCategory.get(issue.category) ?? []
    existing.push(issue)
    byCategory.set(issue.category, existing)
  }

  for (const [cat, catIssues] of byCategory) {
    const label = CATEGORY_LABELS[cat] ?? cat
    const catScore = result.categories[cat]?.score ?? "?"
    lines.push(`### ${label} (${catScore}/100)`)
    lines.push(``)

    for (const issue of catIssues) {
      lines.push(`- ${statusEmoji(issue.status)} **${issue.id}**: ${issue.message}`)
      if (issue.suggestion) {
        lines.push(`  - **Fix:** ${issue.suggestion}`)
      }
    }

    lines.push(``)
  }

  return lines
}

/** Generate a concise fix prompt for clipboard — only the broken stuff */
export const generateClipboardPrompt = (result: AuditResult, opts: PromptOptions): string => {
  const lines: string[] = []

  lines.push(`# Fix GEO issues — ${opts.target}`)
  lines.push(``)
  lines.push(`Score: ${result.grade} (${result.overall_score}/100) · ${result.summary.failed} failed, ${result.summary.warned} warnings`)
  lines.push(``)

  lines.push(...buildIssuesBlock(result, opts))

  if (opts.mode === "local") {
    lines.push(`Files are at \`${opts.target}\`. Fix the issues above, then re-run \`agentimization ${opts.target}\` to verify.`)
  } else {
    lines.push(`Prioritize failures (❌) over warnings (⚠️). Suggest specific code changes.`)
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
      lines.push(`- ✅ **${pass.id}**: ${pass.message}`)
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
    lines.push(`Prioritize failures (❌) over warnings (⚠️).`)
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
