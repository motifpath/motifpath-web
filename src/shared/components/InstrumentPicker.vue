<script setup lang="ts">
import { Check } from 'lucide-vue-next'

import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false })

/** The chosen instruments' ids; empty means the item suits every instrument. */
const instrumentIds = defineModel<string[]>({ required: true })

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
const { instruments, isLoading, error, retry } = useListInstruments()

function toggle(instrumentId: string) {
  instrumentIds.value = instrumentIds.value.includes(instrumentId)
    ? instrumentIds.value.filter((id) => id !== instrumentId)
    : [...instrumentIds.value, instrumentId]
}

function chipClass(chosen: boolean): string {
  return chosen ? 'border-accent bg-accent text-accent-fg' : 'border-border bg-surface text-ink-muted'
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <p v-if="error" data-test="instruments-error" class="flex items-center gap-2 text-sm text-danger">
      {{ t('instrumentPicker.loadError') }}
      <button
        type="button"
        data-test="instruments-retry"
        class="rounded-md border border-border bg-surface-raised px-2.5 py-1 text-[0.8125rem] font-semibold text-ink"
        @click="retry"
      >
        {{ t('buttons.tryAgain') }}
      </button>
    </p>
    <p v-else-if="isLoading" class="text-sm text-ink-subtle">{{ t('instrumentPicker.loading') }}</p>

    <div v-else class="flex flex-wrap gap-2">
      <button
        type="button"
        data-test="instrument-every"
        :aria-pressed="instrumentIds.length === 0 ? 'true' : 'false'"
        :disabled="disabled"
        class="flex items-center gap-1 rounded-full border px-3 py-1 text-sm disabled:cursor-not-allowed"
        :class="chipClass(instrumentIds.length === 0)"
        @click="instrumentIds = []"
      >
        <Check v-if="instrumentIds.length === 0" :size="14" aria-hidden="true" />
        {{ t('instrumentPicker.every') }}
      </button>
      <button
        v-for="instrument in instruments"
        :key="instrument.instrument_id"
        type="button"
        :data-test="`instrument-option-${instrument.instrument_id}`"
        :aria-pressed="instrumentIds.includes(instrument.instrument_id) ? 'true' : 'false'"
        :disabled="disabled"
        class="flex items-center gap-1 rounded-full border px-3 py-1 text-sm disabled:cursor-not-allowed"
        :class="chipClass(instrumentIds.includes(instrument.instrument_id))"
        @click="toggle(instrument.instrument_id)"
      >
        <Check v-if="instrumentIds.includes(instrument.instrument_id)" :size="14" aria-hidden="true" />
        {{ localizedName(instrument.names) }}
      </button>
    </div>
  </div>
</template>
