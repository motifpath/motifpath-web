<script setup lang="ts">
/**
 * One item in an authoring list: its title, one meta line, a status chip when the item has a
 * publish state, and a chevron. The whole row opens the item's editor. The same row at every size.
 */
import { ChevronRight } from 'lucide-vue-next'
import type { RouteLocationRaw } from 'vue-router'

import StatusChip from '@/shared/components/StatusChip.vue'

defineProps<{
  title: string
  meta: string
  /** The item's state in words and a tone; null for an item that is never published. */
  status: { label: string; tone: 'neutral' | 'warning' | 'accent' | 'success' } | null
  to: RouteLocationRaw
}>()
</script>

<template>
  <RouterLink
    :to="to"
    class="flex min-h-20 items-center gap-3 rounded-2xl border border-border bg-surface-raised py-3 pl-3 pr-2 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
  >
    <span class="flex min-w-0 flex-1 flex-col items-start gap-1">
      <span data-test="authoring-row-title" class="w-full truncate text-base font-semibold text-ink">{{ title }}</span>
      <span data-test="authoring-row-meta" class="w-full truncate text-xs font-medium text-ink-muted">{{ meta }}</span>
      <StatusChip v-if="status" data-test="authoring-row-status" :label="status.label" :tone="status.tone" />
    </span>
    <ChevronRight :size="20" class="shrink-0 text-ink-muted" aria-hidden="true" />
  </RouterLink>
</template>
