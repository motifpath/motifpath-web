import { computed } from 'vue'

import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

/**
 * Names an item's instruments for display: "Every instrument" for none,
 * else their names in the UI language, joined. A name still loading shows
 * as an ellipsis.
 */
export function useInstrumentNames() {
  const { t } = useTypedT()
  const { localizedName } = useLocalizedName()
  const { instruments } = useListInstruments()

  const names = computed(
    () => new Map(instruments.value.map((instrument) => [instrument.instrument_id, localizedName(instrument.names)])),
  )

  function instrumentsLabel(instrumentIds: string[]): string {
    if (instrumentIds.length === 0) return t('instrumentPicker.every')
    return instrumentIds.map((id) => names.value.get(id) ?? '…').join(', ')
  }

  return { instrumentsLabel }
}
