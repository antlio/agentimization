import { Box, Text } from "ink"
import type { AuditResult } from "@agentimization/shared"
import { dim, FRAME_INNER_FACTOR } from "./hero-card.js"
import { STATUS_ICONS, GRADE_COLORS } from "./tokens.js"
import { toInkColor } from "./color.js"

// bright/dim pairs share hue and only differ in lightness
// keeps the score field readable as a single field of related cells
const SCORE_PAIRS = {
  pass:    { bright: "oklch(0.858 0.109 142.7)", dim: "oklch(0.584 0.102 139.1)" },
  warn:    { bright: "oklch(0.824 0.101 52.6)",  dim: "oklch(0.572 0.072 53.0)"  },
  fail:    { bright: "oklch(0.718 0.181 10.0)",  dim: "oklch(0.511 0.114 10.3)"  },
  empty:   { bright: "oklch(0.404 0.032 280.2)", dim: "oklch(0.324 0.032 282.0)" },
}

export const RESULT_CARD_WIDTH = 46
const SCORE_FIELD_ROWS = 1
const SCORE_GLYPHS = ["░", "▒", "▓", "█"]

const scoreCell = (row: number, col: number): { glyph: string; bright: boolean } => {
  // same noise function as the hero pattern frozen at frame zero
  const v = (row * 7 + col * 13) % 17
  const idx = Math.floor((v / 17) * SCORE_GLYPHS.length)
  const bright = (row * 5 + col * 11) % 13 < 4
  return { glyph: SCORE_GLYPHS[idx]!, bright }
}

const ScoreField = ({
  passWidth,
  warnWidth,
  failWidth,
  barWidth,
}: {
  passWidth: number
  warnWidth: number
  failWidth: number
  barWidth: number
}) => {
  const emptyWidth = Math.max(0, barWidth - passWidth - warnWidth - failWidth)
  const colorAtCol = (col: number, bright: boolean): string => {
    const pair =
      col < emptyWidth ? SCORE_PAIRS.empty
      : col < emptyWidth + passWidth ? SCORE_PAIRS.pass
      : col < emptyWidth + passWidth + warnWidth ? SCORE_PAIRS.warn
      : SCORE_PAIRS.fail
    return bright ? pair.bright : pair.dim
  }

  return (
    <Box flexDirection="column">
      {Array.from({ length: SCORE_FIELD_ROWS }, (_, r) => {
        const segments: { text: string; color: string }[] = []
        let current: { text: string; color: string } | null = null

        for (let c = 0; c < barWidth; c++) {
          const cell = scoreCell(r, c)
          const color = colorAtCol(c, cell.bright)
          if (current && current.color === color) {
            current.text += cell.glyph
          } else {
            if (current) segments.push(current)
            current = { text: cell.glyph, color }
          }
        }
        if (current) segments.push(current)

        return (
          <Text key={r}>
            {segments.map((s, i) => (
              <Text key={i} color={toInkColor(s.color)}>
                {s.text}
              </Text>
            ))}
          </Text>
        )
      })}
    </Box>
  )
}

export const ResultCard = ({
  result,
  target,
  width = RESULT_CARD_WIDTH,
}: {
  result: AuditResult
  target: string
  width?: number
}) => {
  const { grade, overall_score, summary, latency_ms } = result
  const gc = GRADE_COLORS[grade] ?? "red"

  const barWidth = width - 4
  const total = summary.total || 1
  const passWidth = Math.max(Math.round((summary.passed / total) * barWidth), summary.passed > 0 ? 1 : 0)
  const warnWidth = Math.max(Math.round((summary.warned / total) * barWidth), summary.warned > 0 ? 1 : 0)
  const failWidth = Math.max(Math.round((summary.failed / total) * barWidth), summary.failed > 0 ? 1 : 0)

  const seconds = (latency_ms / 1000).toFixed(1)
  const headerChrome = `${grade} ${overall_score}/100`.length + 3 + 3 + `${seconds}s`.length
  const targetMax = Math.max(8, barWidth - headerChrome)
  const targetLabel = target.length <= targetMax ? target : target.slice(0, targetMax - 1) + "…"

  return (
    <Box
      flexDirection="column"
      marginTop={1}
      borderStyle="round"
      borderColor={dim(gc, FRAME_INNER_FACTOR)}
      paddingX={1}
      width={width}
    >
      <Box>
        <Text color={toInkColor(gc)}>{grade}</Text>
        <Text> {overall_score}/100</Text>
        <Text dimColor>   {targetLabel}</Text>
        <Text dimColor>   {seconds}s</Text>
      </Box>

      <Box marginTop={1}>
        <ScoreField
          passWidth={passWidth}
          warnWidth={warnWidth}
          failWidth={failWidth}
          barWidth={barWidth}
        />
      </Box>

      <Box marginTop={1}>
        {summary.skipped > 0 ? (
          <>
            <Text dimColor>{STATUS_ICONS.skip} {summary.skipped}</Text>
            <Text dimColor>   </Text>
          </>
        ) : null}
        <Text color={toInkColor(SCORE_PAIRS.pass.bright)}>{STATUS_ICONS.pass} {summary.passed}</Text>
        <Text dimColor>   </Text>
        <Text color={toInkColor(SCORE_PAIRS.warn.bright)}>{STATUS_ICONS.warn} {summary.warned}</Text>
        <Text dimColor>   </Text>
        <Text color={toInkColor(SCORE_PAIRS.fail.bright)}>{STATUS_ICONS.fail} {summary.failed}</Text>
      </Box>
    </Box>
  )
}
