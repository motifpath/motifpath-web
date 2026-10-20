<script setup lang="ts">
import type { Component } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

withDefaults(
  defineProps<{
    label: string
    icon: Component
    to: RouteLocationRaw
    current?: boolean
    /** `stacked`: icon over label (bottom bar, rail). `row`: icon beside label (sidebar). */
    layout?: 'stacked' | 'row'
  }>(),
  { current: false, layout: 'stacked' },
)
</script>

<template>
  <!-- The current place is told by aria-current, an indicator pill and a bolder label, so it never
       rests on colour alone. -->
  <RouterLink
    v-if="layout === 'stacked'"
    :to="to"
    :aria-current="current ? 'page' : undefined"
    class="flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
  >
    <span class="relative flex h-6 w-14 items-center justify-center">
      <span v-if="current" data-test="nav-indicator" class="absolute inset-0 rounded-full bg-accent-muted" aria-hidden="true" />
      <component :is="icon" :size="22" class="relative" :class="current ? 'text-accent-text' : 'text-ink-muted'" aria-hidden="true" />
    </span>
    <span class="whitespace-nowrap text-xs" :class="current ? 'font-bold text-accent-text' : 'font-medium text-ink-muted'">{{
      label
    }}</span>
  </RouterLink>

  <RouterLink
    v-else
    :to="to"
    :aria-current="current ? 'page' : undefined"
    class="relative flex min-h-12 items-center gap-3 rounded-full px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    :class="current ? '' : 'hover:bg-surface-sunken'"
  >
    <span v-if="current" data-test="nav-indicator" class="absolute inset-0 rounded-full bg-accent-muted" aria-hidden="true" />
    <component :is="icon" :size="22" class="relative shrink-0" :class="current ? 'text-accent-text' : 'text-ink-muted'" aria-hidden="true" />
    <span class="relative truncate text-sm" :class="current ? 'font-bold text-accent-text' : 'font-medium text-ink'">{{ label }}</span>
  </RouterLink>
</template>
