import { describe, it, expect } from "vitest"
import type { AuditResult } from "@agentimization/shared"
import { generateClipboardPrompt, generateAgentPrompt } from "../agent-prompt.js"

const resultWith = (): AuditResult => ({
  url: "https://example.com/",
  timestamp: "2026-01-01T00:00:00Z",
  overall_score: 56,
  grade: "C",
  checks: [
    {
      id: "topical-authority-signals",
      name: "Topical Authority Signals",
      category: "geo-signals",
      status: "fail",
      message: "Weak internal linking: avg 0 internal links/page",
      suggestion: "Increase internal linking between related pages. Generative engines use link density to assess topical authority.",
      metadata: { avgLinks: 0, pagesWithGoodLinking: 0 },
    },
  ],
  summary: { total: 1, passed: 0, warned: 0, failed: 1, skipped: 0 },
  categories: { "geo-signals": { score: 41, checks: 1, passed: 0 } },
  latency_ms: 1,
})

const opts = { mode: "remote" as const, target: "https://example.com/" }

const resultWithSuggestion = (suggestion: string): AuditResult => {
  const r = resultWith()
  r.checks[0]!.suggestion = suggestion
  return r
}

describe("generateClipboardPrompt (terse, agent-facing)", () => {
  it("renders each issue as '- <id> (STATUS): ...' with an indented -> fix", () => {
    const out = generateClipboardPrompt(resultWith(), opts)
    expect(out).toContain("- topical-authority-signals (FAIL): Weak internal linking")
    expect(out).toMatch(/\n {2}-> Increase internal linking/)
  })

  it("strips trailing rationale sentences from the fix", () => {
    const out = generateClipboardPrompt(
      resultWithSuggestion("Do the thing. Generative engines love it."),
      opts,
    )
    expect(out).toContain("-> Do the thing.")
    expect(out).not.toContain("Generative engines")
  })

  it("rescues a URL out of a dropped rationale sentence", () => {
    const out = generateClipboardPrompt(
      resultWithSuggestion("Do the thing. AI agents use it, see https://example.com/spec here."),
      opts,
    )
    expect(out).not.toContain("AI agents use it")
    expect(out).toContain("https://example.com/spec")
  })
})

describe("generateAgentPrompt (verbose, human-facing report)", () => {
  it("keeps markdown decoration (### headings, **Fix:**)", () => {
    const out = generateAgentPrompt(resultWith(), opts)
    expect(out).toContain("### ")
    expect(out).toContain("**Fix:**")
  })

  it("emits a Success line for a check in the table, with interpolated metadata", () => {
    const out = generateAgentPrompt(resultWith(), opts)
    expect(out).toMatch(/- \*\*Success:\*\* avg >=5 internal links\/page/)
    expect(out).toContain("now avg 0/page")
  })
})
