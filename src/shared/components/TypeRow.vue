<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import type { Component } from 'vue'

/** One choice of a type chooser: what the type is called and what the student does with it. */
defineProps<{ icon: Component; label: string; description: string }>()
const emit = defineEmits<{ click: [] }>()
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface-raised p-4 text-left hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    @click="emit('click')"
  >
    <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-muted text-accent-text">
      <component :is="icon" :size="20" aria-hidden="true" />
    </span>
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span data-test="type-row-label" class="text-base font-semibold text-ink">{{ label }}</span>
      <span data-test="type-row-description" class="text-sm text-ink-muted">{{ description }}</span>
    </span>
    <ChevronRight :size="18" class="shrink-0 text-ink-muted" aria-hidden="true" />
  </button>
</template>
