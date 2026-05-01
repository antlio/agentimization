import React, { useEffect, useState } from "react"
import { Box, Text } from "ink"
import type { Phase } from "./tokens.js"
import { toInkColor } from "./color.js"

interface HeroCardProps {
  target: string
  isLocal: boolean
  phase: Phase
  checksDone: number
  checksTotal: number
  grade?: string
  score?: number
  gradeColor?: string
}

const CARD_WIDTH = 46
const PATTERN_ROWS = 4
const PATTERN_COLS = CARD_WIDTH - 4
const PATTERN_GLYPHS = ["░", "▒", "▓", "█"]

export const ACCENT_BY_PHASE: Record<Phase, string> = {
  init: "oklch(0.787 0.119 304.8)",
  fetching: "oklch(0.787 0.119 304.8)",
  checking: "oklch(0.847 0.083 210.3)",
  scoring: "oklch(0.824 0.101 52.6)",
  done: "oklch(0.858 0.109 142.7)",
  error: "oklch(0.718 0.181 10.0)",
}

const FETCHING_LOCAL_MESSAGES = [
  "Poking around your files…",
  "Sniffing through your folders…",
  "Reading what you've got…",
  "Walking the directory tree…",
  "Browsing your project…",
]

const FETCHING_REMOTE_MESSAGES = [
  "Crawling the site, one sec…",
  "Loading up the pages…",
  "Following the links…",
  "Hitting the URL…",
  "Fetching what's there…",
]

const CHECKING_MESSAGES = [
  "Checking things…",
  "Running the checks…",
  "Looking under the hood…",
  "Inspecting the goods…",
  "Doing the audit…",
]

const SCORING_MESSAGES = [
  "Crunching the numbers…",
  "Tallying the score…",
  "Doing the math…",
  "Adding it all up…",
  "Working out the grade…",
]

const pickOnce = (pool: string[]): string => pool[Math.floor(Math.random() * pool.length)]!

// picked once per run so the message stays stable while the audit is in flight
const RUN_MESSAGES = {
  fetchingLocal: pickOnce(FETCHING_LOCAL_MESSAGES),
  fetchingRemote: pickOnce(FETCHING_REMOTE_MESSAGES),
  checking: pickOnce(CHECKING_MESSAGES),
  scoring: pickOnce(SCORING_MESSAGES),
}

const STATUS_BY_PHASE = (
  phase: Phase,
  isLocal: boolean,
  checksDone: number,
  checksTotal: number,
): string => {
  switch (phase) {
    case "init":
    case "fetching":
      return isLocal ? RUN_MESSAGES.fetchingLocal : RUN_MESSAGES.fetchingRemote
    case "checking":
      return `${RUN_MESSAGES.checking} ${checksDone}/${checksTotal || "?"}`
    case "scoring":
      return RUN_MESSAGES.scoring
    case "done":
      return "Audit complete"
    case "error":
      return "Something went wrong"
  }
}

const cellGlyph = (row: number, col: number, frame: number, accentMod: number): {
  char: string
  accent: boolean
} => {
  // deterministic noise so the same coords produce the same glyph each render
  const v = (row * 7 + col * 13 + frame * 3) % 17
  const idx = Math.floor((v / 17) * PATTERN_GLYPHS.length)
  const accent = (row * 5 + col * 11 + accentMod) % 13 < 5
  return { char: PATTERN_GLYPHS[idx]!, accent }
}

// ─── Mini loader ─────────────────────────────────────────
// quadrant glyphs sit at the text baseline so the loader is one line tall

const MINI_COLS = 3
const MINI_GLYPHS = ["▖", "▗", "▘", "▝"]

export const MiniLoader = ({
  color = "oklch(0.787 0.119 304.8)",
  intervalMs = 120,
}: {
  color?: string
  intervalMs?: number
}) => {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => (f + 1) % 1000), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])

  const segments: { text: string; color: string }[] = []
  let current: { text: string; color: string } | null = null

  for (let c = 0; c < MINI_COLS; c++) {
    const v = (c * 13 + frame * 3) % 17
    const idx = Math.floor((v / 17) * MINI_GLYPHS.length)
    const accent = (c * 11 + frame) % 13 < 5
    const char = MINI_GLYPHS[idx]!
    const cellColor = accent ? color : "oklch(0.404 0.032 280.2)"

    if (current && current.color === cellColor) {
      current.text += char
    } else {
      if (current) segments.push(current)
      current = { text: char, color: cellColor }
    }
  }
  if (current) segments.push(current)

  return (
    <Text>
      {segments.map((s, i) => (
        <Text key={i} color={toInkColor(s.color)}>
          {s.text}
        </Text>
      ))}
    </Text>
  )
}

interface Overlay {
  row: number
  col: number
  chars: string[] // pre-split: each entry is one rendered cell (handles multi-codepoint glyphs)
  color: string
}

const Pattern = ({
  accent,
  frame,
  overlay,
}: {
  accent: string
  frame: number
  overlay?: Overlay
}) => {
  const overlayStart = overlay ? overlay.col : -1
  const overlayEnd = overlay ? overlay.col + overlay.chars.length : -1

  const rows = Array.from({ length: PATTERN_ROWS }, (_, r) => {
    const segments: { text: string; color: string }[] = []
    let current: { text: string; color: string } | null = null

    const isOverlayRow = overlay && r === overlay.row

    for (let c = 0; c < PATTERN_COLS; c++) {
      let char: string
      let color: string

      if (isOverlayRow && c >= overlayStart && c < overlayEnd) {
        char = overlay.chars[c - overlayStart]!
        color = overlay.color
      } else {
        const cell = cellGlyph(r, c, frame, frame)
        char = cell.char
        color = cell.accent ? accent : "oklch(0.404 0.032 280.2)"
      }

      if (current && current.color === color) {
        current.text += char
      } else {
        if (current) segments.push(current)
        current = { text: char, color }
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
  })

  return <Box flexDirection="column">{rows}</Box>
}

const truncate = (s: string, max: number): string =>
  s.length <= max ? s : s.slice(0, max - 1) + "…"

// scale every channel toward black by factor (0 keeps color, 1 returns black)
// accepts oklch or hex and always returns chalk-friendly hex
export const dim = (color: string, factor: number): string => {
  const hex = toInkColor(color)
  const m = hex.match(/^#?([a-f\d]{6})$/i)
  if (!m) return hex
  const n = parseInt(m[1]!, 16)
  const r = Math.round(((n >> 16) & 0xff) * (1 - factor))
  const g = Math.round(((n >> 8) & 0xff) * (1 - factor))
  const b = Math.round((n & 0xff) * (1 - factor))
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`
}

export const FRAME_INNER_FACTOR = 0.5 // how much to darken the accent for the card border

// ─── Shimmer ─────────────────────────────────────────────
// a bright highlight drifts left to right across the text and fades into a dim base

const SHIMMER_INTERVAL_MS = 60
const SHIMMER_GAP = 18 // empty cells between sweeps to make it pulse
const SHIMMER_FALLOFF = 4 // half width of the bright peak

const shimmerColor = (
  index: number,
  head: number,
  cycleLen: number,
  accent: string,
): string => {
  // wrap-aware distance to the highlight head
  let d = ((index - head) % cycleLen + cycleLen) % cycleLen
  if (d > cycleLen / 2) d = cycleLen - d
  if (d <= 0) return accent
  if (d <= SHIMMER_FALLOFF) return "oklch(0.879 0.043 272.3)" // bright
  if (d <= SHIMMER_FALLOFF * 2) return "oklch(0.751 0.040 273.9)" // mid
  return "oklch(0.550 0.034 277.1)" // dim base
}

const Shimmer = ({ text, accent }: { text: string; accent: string }) => {
  const [head, setHead] = useState(0)

  useEffect(() => {
    const cycleLen = text.length + SHIMMER_GAP
    const timer = setInterval(() => {
      setHead((h) => (h + 1) % cycleLen)
    }, SHIMMER_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [text.length])

  const cycleLen = text.length + SHIMMER_GAP
  const segments: { text: string; color: string }[] = []
  let current: { text: string; color: string } | null = null

  for (let i = 0; i < text.length; i++) {
    const color = shimmerColor(i, head, cycleLen, accent)
    const ch = text[i]!
    if (current && current.color === color) {
      current.text += ch
    } else {
      if (current) segments.push(current)
      current = { text: ch, color }
    }
  }
  if (current) segments.push(current)

  return (
    <Text>
      {segments.map((s, i) => (
        <Text key={i} color={toInkColor(s.color)}>
          {s.text}
        </Text>
      ))}
    </Text>
  )
}

export const HeroCard = ({
  target,
  isLocal,
  phase,
  checksDone,
  checksTotal,
  grade,
  score,
  gradeColor,
}: HeroCardProps) => {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (phase === "done" || phase === "error") return
    const timer = setInterval(() => setFrame((f) => (f + 1) % 1000), 120)
    return () => clearInterval(timer)
  }, [phase])

  const accent = phase === "done" && gradeColor ? gradeColor : ACCENT_BY_PHASE[phase]
  const status = STATUS_BY_PHASE(phase, isLocal, checksDone, checksTotal)
  const targetLabel = truncate(target, PATTERN_COLS)
  const showGrade = phase === "done" && grade !== undefined && score !== undefined

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={dim(accent, FRAME_INNER_FACTOR)}
      paddingX={1}
      width={CARD_WIDTH}
    >
      <Pattern
        accent={accent}
        frame={frame}
        overlay={{
          row: PATTERN_ROWS - 1,
          col: PATTERN_COLS - "agentimization".length - 1,
          chars: Array.from(" agentimization"),
          color: accent,
        }}
      />

      <Box marginTop={1}>
        <Text>{targetLabel}</Text>
      </Box>

      <Box marginTop={1}>
        {showGrade ? (
          <>
            <Text color={toInkColor(accent)}>
              {grade}
            </Text>
            <Text> {score}/100</Text>
            <Text dimColor>   {status}</Text>
          </>
        ) : (
          <Shimmer text={status} accent={accent} />
        )}
      </Box>
    </Box>
  )
}
