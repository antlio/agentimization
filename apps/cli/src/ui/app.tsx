import { useState } from "react"
import { Box, Text, Static, useStdout } from "ink"
import { audit, auditLocal, ALL_CHECKS } from "@agentimization/core"
import type { AuditResult, AuditEvent, CheckCategory } from "@agentimization/shared"
import { HeroCard, dim, FRAME_INNER_FACTOR } from "./hero-card.js"
import { ResultCard } from "./result-card.js"
import { CategorySection } from "./check-list.js"
import { ActionMenu } from "./action-menu.js"
import { ErrorActions } from "./error-actions.js"
import { resolveTarget } from "./target.js"
import { GRADE_COLORS, type Phase, type CheckState } from "./tokens.js"
import { ACCENT_BY_PHASE } from "./hero-card.js"
import { toInkColor } from "./color.js"
import { useMountEffect } from "../hooks/use-mount-effect.js"

interface AppProps {
  target: string
  isLocal: boolean
  categories?: CheckCategory[]
  sampleSize?: number
  autoDetectedFrom?: string
}

export const App = ({
  target: initialTarget,
  isLocal: initialIsLocal,
  categories,
  sampleSize,
  autoDetectedFrom,
}: AppProps) => {
  const [target, setTarget] = useState(initialTarget)
  const [isLocal, setIsLocal] = useState(initialIsLocal)
  const [retryError, setRetryError] = useState<string | null>(null)

  const { stdout } = useStdout()
  const [columns, setColumns] = useState(stdout?.columns ?? 80)
  useMountEffect(() => {
    if (!stdout) return
    const onResize = () => setColumns(stdout.columns)
    stdout.on("resize", onResize)
    return () => {
      stdout.off("resize", onResize)
    }
  })
  const cardWidth = Math.max(40, Math.min(columns - 2, 72))

  const handleRetry = (newInput: string) => {
    const resolved = resolveTarget(newInput)
    if ("error" in resolved) {
      setRetryError(resolved.error)
      return
    }
    setRetryError(null)
    setTarget(resolved.target)
    setIsLocal(resolved.isLocal)
  }

  if (retryError) {
    return (
      <ErrorCard message={retryError} target={target} cardWidth={cardWidth} onRetry={handleRetry} />
    )
  }

  return (
    <AuditRunner
      key={`${target}|${isLocal}`}
      target={target}
      isLocal={isLocal}
      categories={categories}
      sampleSize={sampleSize}
      autoDetectedFrom={autoDetectedFrom}
      cardWidth={cardWidth}
      onRetry={handleRetry}
    />
  )
}

const ErrorCard = ({
  message,
  target,
  cardWidth,
  onRetry,
}: {
  message: string
  target: string
  cardWidth: number
  onRetry: (input: string) => void
}) => {
  const errorColor = "oklch(0.718 0.181 10.0)"
  const lines = message.split("\n")
  return (
    <Box flexDirection="column" paddingLeft={1}>
      <Box
        flexDirection="column"
        marginTop={1}
        borderStyle="round"
        borderColor={dim(errorColor, FRAME_INNER_FACTOR)}
        paddingX={1}
        width={cardWidth}
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
      <ErrorActions onRetry={onRetry} />
    </Box>
  )
}

interface AuditRunnerProps {
  target: string
  isLocal: boolean
  categories?: CheckCategory[]
  sampleSize?: number
  autoDetectedFrom?: string
  cardWidth: number
  onRetry: (input: string) => void
}

const AuditRunner = ({
  target,
  isLocal,
  categories,
  sampleSize,
  autoDetectedFrom,
  cardWidth,
  onRetry,
}: AuditRunnerProps) => {
  const [phase, setPhase] = useState<Phase>("init")
  const [checks, setChecks] = useState<CheckState[]>([])
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [networkSkipped, setNetworkSkipped] = useState(0)

  useMountEffect(() => {
    const onEvent = (event: AuditEvent) => {
      switch (event.type) {
        case "phase":
          setPhase(event.phase)
          break
        case "check-start":
          setChecks((prev) => [...prev, { ...event.check, status: "running" }])
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
          setNetworkSkipped(ALL_CHECKS.length - res.summary.total)
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
  })

  const checksByCategory = new Map<string, CheckState[]>()
  for (const check of checks) {
    const existing = checksByCategory.get(check.category) ?? []
    existing.push(check)
    checksByCategory.set(check.category, existing)
  }

  const categoryEntries = [...checksByCategory.entries()]
  const committedCount = phase === "done" ? categoryEntries.length : Math.max(0, categoryEntries.length - 1)
  const committedCategories = categoryEntries.slice(0, committedCount)
  const liveCategory = categoryEntries[committedCount] // undefined once done

  if (phase === "error") {
    return (
      <ErrorCard
        message={error ?? "Unknown error"}
        target={target}
        cardWidth={cardWidth}
        onRetry={onRetry}
      />
    )
  }

  const checksDone = checks.filter((c) => c.status === "done").length
  const accent = result ? GRADE_COLORS[result.grade] ?? ACCENT_BY_PHASE[phase] : ACCENT_BY_PHASE[phase]

  return (
    <>
      <Static items={committedCategories}>
        {([cat, catChecks]) => (
          <Box key={cat} paddingLeft={1}>
            <CategorySection category={cat} checks={catChecks} loaderColor={accent} />
          </Box>
        )}
      </Static>

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
            width={cardWidth}
          />
        </Box>

        {autoDetectedFrom ? (
          <Text dimColor>auto-detected build output (was {autoDetectedFrom})</Text>
        ) : null}

        {isLocal && networkSkipped > 0 && phase === "done" ? (
          <Text dimColor>{networkSkipped} network-only checks skipped</Text>
        ) : null}

        {liveCategory ? (
          <CategorySection
            category={liveCategory[0]}
            checks={liveCategory[1]}
            loaderColor={accent}
          />
        ) : null}

        {result ? (
          <Box flexDirection="column">
            <ResultCard result={result} target={target} width={cardWidth} />
            <ActionMenu result={result} target={target} isLocal={isLocal} onRetry={onRetry} />
          </Box>
        ) : null}
      </Box>
    </>
  )
}
