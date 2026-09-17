<script setup lang="ts" generic="T extends { id: string; correct: boolean }">
import { Check, X } from 'lucide-vue-next'
import type { Component } from 'vue'

/**
 * Shared chrome for an options editor whose options carry their own media
 * (image_choice, audio_selection, ...): the grid, each option's bordered
 * card with its remove/correct-toggle buttons, and the add-option tile.
 * Callers supply only the type-specific media cell via the #media slot
 * (and optionally #extra for a field below it, e.g. a label input) — the
 * card chrome, button wiring, and layout live here once instead of being
 * copy-pasted per option type.
 */
withDefaults(defineProps<{ options: T[]; compact?: boolean; addIcon: Component; addLabel: string }>(), {
  compact: false,
})
const emit = defineEmits<{ toggle: [id: string]; remove: [id: string]; add: [] }>()
</script>

<template>
  <div class="grid gap-3" :class="compact ? 'grid-cols-2' : 'grid-cols-3'">
    <div
      v-for="option in options"
      :key="option.id"
      class="flex flex-col gap-2 rounded-md border p-2.5"
      :class="option.correct ? 'border-success' : 'border-border'"
    >
      <div class="relative">
        <slot name="media" :option="option" />
        <button
          type="button"
          data-test="option-remove"
          aria-label="Remove option"
          class="absolute right-1 top-1 flex h-[22px] w-[22px] items-center justify-center rounded bg-surface-raised text-ink-subtle"
          @click="emit('remove', option.id)"
        >
          <X :size="12" aria-hidden="true" />
        </button>
      </div>
      <slot name="extra" :option="option" />
      <button
        type="button"
        data-test="option-correct"
        :aria-pressed="option.correct"
        class="flex items-center justify-center gap-1.5 rounded-sm border px-2.5 py-[5px] text-xs font-semibold"
        :class="option.correct ? 'border-success bg-success-muted text-success' : 'border-border bg-surface-raised text-ink-muted'"
        @click="emit('toggle', option.id)"
      >
        <Check v-if="option.correct" :size="12" aria-hidden="true" />
        Correct answer
      </button>
    </div>
    <button
      type="button"
      data-test="add-option"
      class="flex min-h-[150px] flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border text-accent"
      @click="emit('add')"
    >
      <component :is="addIcon" :size="18" aria-hidden="true" />
      <span class="text-[0.8125rem] font-semibold">{{ addLabel }}</span>
    </button>
    <slot name="modal" />
  </div>
</template>
