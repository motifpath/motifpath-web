<script setup lang="ts">
/**
 * The top of a page pushed onto another: an arrow back to that page, and its name. The arrow is
 * the only link, so its label says where it goes; the name beside it is there to be read.
 */
import { ArrowLeft } from 'lucide-vue-next'
import type { RouteLocationRaw } from 'vue-router'

defineProps<{
  /** The page this one was pushed onto, e.g. the path's title. */
  title: string
  to: RouteLocationRaw
  /** The arrow's accessible name, e.g. "Back to My path". */
  backLabel: string
}>()
</script>

<template>
  <div class="flex h-14 min-w-0 items-center gap-1">
    <RouterLink
      :to="to"
      :aria-label="backLabel"
      data-test="page-back"
      class="-ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      <ArrowLeft :size="22" aria-hidden="true" />
    </RouterLink>
    <p data-test="page-back-title" class="truncate text-base font-semibold text-ink">{{ title }}</p>
  </div>
</template>
