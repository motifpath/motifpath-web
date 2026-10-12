<script setup lang="ts">
/** A root note: one of the twelve, or Any. A diagram has one root, so this takes one note. */
import { ChevronDown } from 'lucide-vue-next'
import { useId } from 'vue'

import { useTypedT } from '@/shared/composables/useTypedT'
import { CHROMATIC_SCALE } from '@/shared/utils/musicTheory'

const note = defineModel<string | undefined>({ required: true })

const { t } = useTypedT()
const id = useId()

function onChange(event: Event) {
  if (!(event.target instanceof HTMLSelectElement)) return
  note.value = event.target.value || undefined
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{{ t('rootNoteSelect.label') }}</label>
    <div class="relative w-28">
      <select
        :id="id"
        :value="note ?? ''"
        class="h-11 w-full appearance-none rounded-md border border-border bg-surface-raised pl-3 pr-8 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        @change="onChange"
      >
        <option value="">{{ t('rootNoteSelect.any') }}</option>
        <option v-for="option in CHROMATIC_SCALE" :key="option" :value="option">{{ option }}</option>
      </select>
      <ChevronDown :size="20" class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
    </div>
  </div>
</template>
