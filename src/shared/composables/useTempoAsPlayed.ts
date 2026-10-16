import { useTypedT } from '@/shared/composables/useTypedT'
import type { TempoNoteValue } from '@/shared/utils/tempoNoteValue'

/**
 * A tempo in words as it was played: "80 BPM", or with any note value but quarters "80 BPM in
 * eighths", so a tempo is never read as faster or slower than it was.
 */
export function useTempoAsPlayed() {
  const { t } = useTypedT()

  function asPlayed(bpm: number, noteValue: TempoNoteValue): string {
    if (noteValue === 'quarters') return t('tempoAsPlayed.quarters', { bpm })
    return t('tempoAsPlayed.other', { bpm, value: t(`noteValueIn.${noteValue}`) })
  }

  /** The same without the unit, where the sentence already says BPM: "80", "80 in eighths". */
  function shortAsPlayed(bpm: number, noteValue: TempoNoteValue): string {
    if (noteValue === 'quarters') return String(bpm)
    return t('tempoAsPlayed.shortOther', { bpm, value: t(`noteValueIn.${noteValue}`) })
  }

  return { asPlayed, shortAsPlayed }
}
