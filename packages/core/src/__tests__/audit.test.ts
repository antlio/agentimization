import { describe, it, expect } from "vitest"
import { resolve } from "node:path"
import { auditLocal } from "../index.js"

const FIXTURES = resolve(import.meta.dirname, "fixtures")

describe("auditLocal", () => {
  it("scores good-site higher than bad-site", async () => {
    const good = await auditLocal(resolve(FIXTURES, "good-site"))
    const bad = await auditLocal(resolve(FIXTURES, "bad-site"))

    expect(good.overall_score).toBeGreaterThan(bad.overall_score)
  })

  it("returns correct summary counts", async () => {
    const result = await auditLocal(resolve(FIXTURES, "good-site"))

    expect(result.summary.total).toBe(
      result.summary.passed + result.summary.warned + result.summary.failed + result.summary.skipped,
    )
  })

  it("assigns a valid grade", async () => {
    const result = await auditLocal(resolve(FIXTURES, "good-site"))

    expect(["A+", "A", "B", "C", "D", "F"]).toContain(result.grade)
  })

  it("grade matches score range", async () => {
    const result = await auditLocal(resolve(FIXTURES, "good-site"))
    const { grade, overall_score } = result

    if (grade === "A+") expect(overall_score).toBeGreaterThanOrEqual(95)
    else if (grade === "A") expect(overall_score).toBeGreaterThanOrEqual(85)
    else if (grade === "B") expect(overall_score).toBeGreaterThanOrEqual(70)
    else if (grade === "C") expect(overall_score).toBeGreaterThanOrEqual(55)
    else if (grade === "D") expect(overall_score).toBeGreaterThanOrEqual(40)
    else expect(overall_score).toBeLessThan(40)
  })

  it("skips network-only checks in local mode", async () => {
    const result = await auditLocal(resolve(FIXTURES, "good-site"))

    // link-headers needs the network so a local audit must skip it
    const linkHeaders = result.checks.find((c) => c.id === "link-headers")
    expect(linkHeaders).toBeUndefined()
  })

  it("filters by category", async () => {
    const result = await auditLocal(resolve(FIXTURES, "good-site"), {
      categories: ["content-discoverability"],
    })

    const otherCategories = result.checks.filter(
      (c) => c.category !== "content-discoverability",
    )
    expect(otherCategories).toHaveLength(0)
    expect(result.checks.length).toBeGreaterThan(0)
  })

  it("passes agents-md check for good-site", async () => {
    const result = await auditLocal(resolve(FIXTURES, "good-site"), {
      categories: ["agent-protocols"],
    })

    const agentsMd = result.checks.find((c) => c.id === "agents-md")
    expect(agentsMd).toBeDefined()
    expect(agentsMd!.status).toBe("pass")
  })

  it("fails agents-md check for bad-site", async () => {
    const result = await auditLocal(resolve(FIXTURES, "bad-site"), {
      categories: ["agent-protocols"],
    })

    const agentsMd = result.checks.find((c) => c.id === "agents-md")
    expect(agentsMd).toBeDefined()
    expect(agentsMd!.status).toBe("fail")
  })

  it("emits events when onEvent is provided", async () => {
    const events: string[] = []

    await auditLocal(resolve(FIXTURES, "good-site"), {
      onEvent: (e) => events.push(e.type),
    })

    expect(events).toContain("phase")
    expect(events).toContain("context-ready")
    expect(events).toContain("check-start")
    expect(events).toContain("check-complete")
  })
})
