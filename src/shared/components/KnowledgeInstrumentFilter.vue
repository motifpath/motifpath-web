<script setup lang="ts">
import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

defineProps<{
  /** Offers "Fits this content" — for a picker classifying content with known instruments. */
  fitsContent: boolean
}>()

/** 'content' for the nodes that fit the content, '' for any instrument, or one instrument's id. */
const view = defineModel<string>({ required: true })

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
const { instruments } = useListInstruments()
</script>

<template>
  <label class="flex min-w-0 flex-col gap-1">
    <span class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
      {{ t('skillConceptTreePicker.instrumentFilterLabel') }}
    </span>
    <select
      v-model="view"
      data-test="tree-instrument-filter"
      class="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm"
    >
      <option v-if="fitsContent" value="content">{{ t('skillConceptTreePicker.fitsContent') }}</option>
      <option value="">{{ t('instrumentPicker.any') }}</option>
      <option v-for="instrument in instruments" :key="instrument.instrument_id" :value="instrument.instrument_id">
        {{ localizedName(instrument.names) }}
      </option>
    </select>
  </label>
</template>
