import { useState, useEffect } from "react"
import { Box, Text } from "ink"
import { audit, auditLocal } from "@agentimization/core"
import type { AuditResult, AuditEvent, CheckCategory } from "@agentimization/shared"
import { HeroCard, dim, FRAME_INNER_FACTOR } from "./hero-card.js"
import { ResultCard, RESULT_CARD_WIDTH } from "./result-card.js"
import { CategorySection } from "./check-list.js"
import { ActionMenu } from "./action-menu.js"
import { ErrorActions } from "./error-actions.js"
import { resolveTarget } from "./target.js"
import { GRADE_COLORS, type Phase, type CheckState } from "./tokens.js"
import { ACCENT_BY_PHASE } from "./hero-card.js"
import { toInkColor } from "./color.js"

interface AppProps {
  target: string
  isLocal: boolean
  categories?: CheckCategory[]
  sampleSize?: number
}

export const App = ({ target: initialTarget, isLocal: initialIsLocal, categories, sampleSize }: AppProps) => {
  const [target, setTarget] = useState(initialTarget)
  const [isLocal, setIsLocal] = useState(initialIsLocal)
  const [phase, setPhase] = useState<Phase>("init")
  const [checks, setChecks] = useState<CheckState[]>([])
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [networkSkipped, setNetworkSkipped] = useState(0)

  useEffect(() => {
    const onEvent = (event: AuditEvent) => {
      switch (event.type) {
        case "phase":
          setPhase(event.phase)
          break
        case "check-start":
          setChecks((prev) => [
            ...prev,
            { ...event.check, status: "running" },
          ])
          break
        case "check-complete":
          setChecks((prev) =>
            prev.map((c) =>
              c.id === event.result.id
                ? { ...c, status: "done" as const, result: event.result }
                : c,
            ),
          )
          break
      }
    }

    const run = async () => {
      try {
        const config = { categories, sampleSize, onEvent }
        const res = isLocal
          ? await auditLocal(target, config)
          : await audit(target, config)

        if (isLocal) {
          setNetworkSkipped(35 - res.summary.total)
        }

        setResult(res)
        setPhase("done")
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error"

        if (msg.includes("fetch failed") || msg.includes("ENOTFOUND") || msg.includes("EAI_AGAIN")) {
          setError("Could not reach the URL.\nCheck the address and your network connection.")
        } else {
          setError(msg)
        }
        setPhase("error")
      }
    }

    run()
  }, [target, isLocal, categories, sampleSize])

  const handleRetry = (newInput: string) => {
    const resolved = resolveTarget(newInput)
    if ("error" in resolved) {
      setError(resolved.error)
      return
    }
    setError(null)
    setResult(null)
    setChecks([])
    setNetworkSkipped(0)
    setPhase("init")
    setTarget(resolved.target)
    setIsLocal(resolved.isLocal)
  }

  const checksByCategory = new Map<string, CheckState[]>()
  for (const check of checks) {
    const existing = checksByCategory.get(check.category) ?? []
    existing.push(check)
    checksByCategory.set(check.category, existing)
  }

  if (phase === "error") {
    const errorColor = "oklch(0.718 0.181 10.0)"
    const lines = (error ?? "Unknown error").split("\n")
    return (
      <Box flexDirection="column" paddingLeft={1}>
        <Box
          flexDirection="column"
          marginTop={1}
          borderStyle="round"
          borderColor={dim(errorColor, FRAME_INNER_FACTOR)}
          paddingX={1}
          width={RESULT_CARD_WIDTH}
        >
          <Text bold color={toInkColor(errorColor)}>Error</Text>
          <Text>{target}</Text>
          <Box marginTop={1} flexDirection="column">
            {lines.map((line, i) => (
              <Text key={i} dimColor={i > 0}>
                {line}
              </Text>
            ))}
          </Box>
        </Box>
        <ErrorActions onRetry={handleRetry} />
      </Box>
    )
  }

  const checksDone = checks.filter((c) => c.status === "done").length
  const accent = result ? GRADE_COLORS[result.grade] ?? ACCENT_BY_PHASE[phase] : ACCENT_BY_PHASE[phase]

  return (
    <Box flexDirection="column" paddingLeft={1}>
      <Box marginTop={1}>
        <HeroCard
          target={target}
          isLocal={isLocal}
          phase={phase}
          checksDone={checksDone}
          checksTotal={checks.length}
          grade={result?.grade}
          score={result?.overall_score}
          gradeColor={result ? GRADE_COLORS[result.grade] : undefined}
        />
      </Box>

      {isLocal && networkSkipped > 0 && phase === "done" ? (
        <Text dimColor>{networkSkipped} network-only checks skipped</Text>
      ) : null}

      {checks.length > 0 ? (
        <Box flexDirection="column">
          {[...checksByCategory.entries()].map(([cat, catChecks]) => (
            <CategorySection
              key={cat}
              category={cat}
              checks={catChecks}
              score={result?.categories[cat]?.score}
              loaderColor={accent}
            />
          ))}
        </Box>
      ) : null}

      {result ? (
        <Box flexDirection="column">
          <ResultCard result={result} target={target} />
          <ActionMenu result={result} target={target} isLocal={isLocal} onRetry={handleRetry} />
        </Box>
      ) : null}
    </Box>
  )
}
