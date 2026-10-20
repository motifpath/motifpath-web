<script setup lang="ts">
import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

/** The instrument to filter by, or null for any instrument. */
const instrumentId = defineModel<string | null>({ required: true })

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
const { instruments } = useListInstruments()

function onChange(event: Event) {
  if (!(event.target instanceof HTMLSelectElement)) return
  instrumentId.value = event.target.value || null
}
</script>

<template>
  <label class="flex flex-col gap-1.5">
    <span class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
      {{ t('instrumentPicker.filterLabel') }}
    </span>
    <select
      data-test="instrument-filter"
      :value="instrumentId ?? ''"
      class="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm"
      @change="onChange"
    >
      <option value="">{{ t('instrumentPicker.any') }}</option>
      <option v-for="instrument in instruments" :key="instrument.instrument_id" :value="instrument.instrument_id">
        {{ localizedName(instrument.names) }}
      </option>
    </select>
  </label>
</template>
