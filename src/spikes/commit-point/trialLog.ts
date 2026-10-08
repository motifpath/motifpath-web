import type { CaseId, TapOutcome, Variant } from '@/spikes/commit-point/variants'

/** One answered item. */
export interface Trial {
  caseId: CaseId
  variant: Variant
  itemKey: string
  /** From the item showing to the answer being committed. */
  answerMs: number
  outcome: TapOutcome
  /** P1: times the clip was played again while its feedback showed. */
  replaysDuringFeedback?: number
  /** P1: the item moved on by itself while the clip was playing. */
  cutOff?: boolean
  /** P1: how long the feedback stayed before the item moved on. */
  feedbackMs?: number
  /** P2: an option was unchosen before the commit. */
  changedMind?: boolean
  /** P3: the board was scrolled before the tap. */
  scrolled?: boolean
}

export interface SummaryRow {
  caseId: CaseId
  variant: Variant
  trials: number
  rightShare: number
  medianAnswerMs: number
  misTapShare: number
  replaysDuringFeedback: number
  cutOffs: number
  changedMinds: number
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length === 0) return 0
  return sorted.length % 2 === 1 ? (sorted[middle] ?? 0) : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

/** One row per case and variant tried, in case then variant order. */
export function summarize(trials: Trial[]): SummaryRow[] {
  const groups = new Map<string, Trial[]>()
  for (const trial of trials) {
    const key = `${trial.caseId}${trial.variant}`
    groups.set(key, [...(groups.get(key) ?? []), trial])
  }
  return [...groups.keys()].sort().map((key) => {
    const group = groups.get(key) ?? []
    const [first] = group
    const share = (count: number) => count / group.length
    return {
      caseId: first!.caseId,
      variant: first!.variant,
      trials: group.length,
      rightShare: share(group.filter((trial) => trial.outcome === 'right').length),
      medianAnswerMs: median(group.map((trial) => trial.answerMs)),
      misTapShare: share(group.filter((trial) => trial.outcome === 'adjacent').length),
      replaysDuringFeedback: group.reduce((sum, trial) => sum + (trial.replaysDuringFeedback ?? 0), 0),
      cutOffs: group.filter((trial) => trial.cutOff).length,
      changedMinds: group.filter((trial) => trial.changedMind).length,
    }
  })
}
