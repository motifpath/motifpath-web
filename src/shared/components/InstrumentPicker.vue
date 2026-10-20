<script setup lang="ts">
import { Check } from 'lucide-vue-next'

import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    /** The only instruments that may be chosen, or null for any — "Every instrument" needs null. */
    allowedIds?: string[] | null
    /** Shown under the options while `allowedIds` limits them, saying why. */
    limitReason?: string
  }>(),
  { disabled: false, allowedIds: null, limitReason: '' },
)

function optionDisabled(instrumentId: string | null): boolean {
  if (props.disabled) return true
  if (props.allowedIds === null) return false
  return instrumentId === null || !props.allowedIds.includes(instrumentId)
}

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
        :disabled="optionDisabled(null)"
        class="flex items-center gap-1 rounded-full border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
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
        :disabled="optionDisabled(instrument.instrument_id)"
        class="flex items-center gap-1 rounded-full border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        :class="chipClass(instrumentIds.includes(instrument.instrument_id))"
        @click="toggle(instrument.instrument_id)"
      >
        <Check v-if="instrumentIds.includes(instrument.instrument_id)" :size="14" aria-hidden="true" />
        {{ localizedName(instrument.names) }}
      </button>
    </div>
    <p v-if="allowedIds !== null && limitReason" data-test="instruments-limit-note" class="text-xs text-ink-subtle">
      {{ limitReason }}
    </p>
  </div>
</template>
