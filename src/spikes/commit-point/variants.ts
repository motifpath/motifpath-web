/**
 * The variants each open commit-point case compares. Every case keeps variant A as the
 * session behaves today, so the others are measured against it.
 */
import { gradeFretboardCell } from '@/shared/utils/fretboardCell'
import type { CellPlace } from '@/shared/utils/fretboardCell'

export type CaseId = 'P1' | 'P2' | 'P3'
export type Variant = 'A' | 'B' | 'C'
export type TapOutcome = 'right' | 'adjacent' | 'wrong'

export const VARIANT_LABELS: Record<CaseId, Record<Variant, string>> = {
  P1: { A: 'Moves on after 900 ms (today)', B: 'Waits for Next', C: 'Holds 2.5 s, replay stops it' },
  P2: { A: 'Check, count hidden (today)', B: 'Commits at the count', C: 'Check, count shown' },
  P3: { A: 'Fits, asked string only (today)', B: 'Fits, any string counts', C: '48 px frets, scrolls' },
}

/** How long a P1 answer's feedback stays before moving on by itself; null when it waits for Next. */
export function advanceDelayMs(variant: Variant, correct: boolean): number | null {
  if (!correct) return null
  if (variant === 'A') return 900
  if (variant === 'C') return 2500
  return null
}

/** Whether replaying the clip during feedback stops the countdown. */
export function replayHoldsAdvance(variant: Variant): boolean {
  return variant === 'C'
}

/** Whether a P2 answer is committed by the selection itself, without Check. */
export function commitsOnSelection(variant: Variant, chosenCount: number, rightCount: number): boolean {
  return variant === 'B' && chosenCount === rightCount
}

/** Whether the prompt tells the student how many options to choose. */
export function showsRightCount(variant: Variant): boolean {
  return variant !== 'A'
}

/** How the P3 board is laid out and which taps it takes. */
export function boardSetup(variant: Variant): { anyStringCounts: boolean; minColumnPx: number | null } {
  return { anyStringCounts: variant === 'B', minColumnPx: variant === 'C' ? 48 : null }
}

/** A tap graded the way the session grades it, with a near miss one fret away told apart. */
export function classifyTap(tuning: string[], asked: CellPlace, tapped: CellPlace): TapOutcome {
  if (gradeFretboardCell(tuning, asked, { response_type: 'find_the_note', ...tapped })) return 'right'
  return tapped.string === asked.string && Math.abs(tapped.fret - asked.fret) === 1 ? 'adjacent' : 'wrong'
}
