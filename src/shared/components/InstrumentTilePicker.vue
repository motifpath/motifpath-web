<script setup lang="ts">
/**
 * Picks one instrument with a single tap: each instrument is a tile with its picture and name. It
 * is a radio group under the hood, so keyboards and screen readers get the usual group behaviour.
 * Given a `noneLabel`, a last tile picks no instrument at all (null).
 */
import { Brain } from 'lucide-vue-next'
import { useId } from 'vue'

import type { components } from '@/api/generated/core-domain'
import InstrumentIcon from '@/shared/components/InstrumentIcon.vue'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'

type Instrument = components['schemas']['Instrument']

defineProps<{
  instruments: Instrument[]
  /** Names the group, shown above the tiles. */
  label: string
  /** Names a last tile that picks no instrument; no such tile without it. */
  noneLabel?: string
}>()

const instrumentId = defineModel<string | null>({ required: true })

const { localizedName } = useLocalizedName()
const groupName = `instrument-${useId()}`
</script>

<template>
  <fieldset class="flex flex-col gap-1.5">
    <legend class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">{{ label }}</legend>
    <div class="flex flex-wrap gap-2">
      <label
        v-for="instrument in instruments"
        :key="instrument.instrument_id"
        data-test="instrument-tile"
        class="flex w-24 cursor-pointer flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center text-xs leading-tight focus-within:ring-2 focus-within:ring-accent"
        :class="instrumentId === instrument.instrument_id ? 'border-accent bg-accent-muted text-ink' : 'border-border text-ink-muted hover:text-ink'"
      >
        <input
          type="radio"
          class="sr-only"
          :name="groupName"
          :value="instrument.instrument_id"
          :checked="instrumentId === instrument.instrument_id"
          @change="instrumentId = instrument.instrument_id"
        />
        <InstrumentIcon :icon="instrument.icon" :family="instrument.family" class="h-10 w-10" />
        <span>{{ localizedName(instrument.names) }}</span>
      </label>
      <label
        v-if="noneLabel"
        data-test="no-instrument-tile"
        class="flex w-24 cursor-pointer flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center text-xs leading-tight focus-within:ring-2 focus-within:ring-accent"
        :class="instrumentId === null ? 'border-accent bg-accent-muted text-ink' : 'border-border text-ink-muted hover:text-ink'"
      >
        <input type="radio" class="sr-only" :name="groupName" :value="null" :checked="instrumentId === null" @change="instrumentId = null" />
        <Brain class="h-10 w-10" :stroke-width="1.5" aria-hidden="true" />
        <span>{{ noneLabel }}</span>
      </label>
    </div>
  </fieldset>
</template>
