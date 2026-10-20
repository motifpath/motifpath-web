/**
 * The states every practice option shares, whatever it shows (text, a picture, a sound): chosen
 * or not before the answer, then right, wrong, or locked once it's in.
 */
export type OptionState = 'default' | 'selected' | 'right' | 'wrong' | 'locked'

/** An option's border and fill in each state. */
export const OPTION_STATE_CLASSES: Record<OptionState, string> = {
  default: 'border border-border bg-surface hover:border-accent',
  selected: 'border-2 border-accent bg-accent-muted',
  right: 'border-2 border-success bg-success-muted',
  wrong: 'border-2 border-danger bg-danger-muted',
  locked: 'border border-border bg-surface opacity-55',
}

/** Whether the answer is in, so the option takes no more choices. */
export const isSettled = (state: OptionState) => state === 'right' || state === 'wrong' || state === 'locked'

/** The state an option shows: its graded mark once the answer is in, otherwise whether it's chosen. */
export function optionState(options: { selected: boolean; mark?: 'right' | 'wrong'; settled: boolean }): OptionState {
  if (options.mark) return options.mark
  if (options.settled) return 'locked'
  return options.selected ? 'selected' : 'default'
}
