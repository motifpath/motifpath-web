<script setup lang="ts">
import type { Component } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

withDefaults(
  defineProps<{
    label: string
    icon: Component
    /** The current value, shown muted before the chevron ("English"). */
    value?: string
    /** Shows › : the row opens a sub-view or another place. */
    chevron?: boolean
    /** Renders a RouterLink to this location instead of a button. */
    to?: RouteLocationRaw
  }>(),
  { value: undefined, chevron: false, to: undefined },
)
const emit = defineEmits<{ click: [] }>()

const ROW =
  'flex min-h-12 w-full items-center gap-3 px-4 text-left text-base text-ink hover:bg-surface-sunken focus-visible:bg-surface-sunken focus-visible:outline-none'
</script>

<template>
  <component :is="to !== undefined ? RouterLink : 'button'" v-bind="to !== undefined ? { to } : { type: 'button' }" :class="ROW" @click="emit('click')">
    <component :is="icon" :size="20" class="shrink-0 text-ink-muted" aria-hidden="true" />
    <span class="flex-1">{{ label }}</span>
    <span v-if="value" class="text-sm text-ink-muted">{{ value }}</span>
    <ChevronRight v-if="chevron" :size="18" class="shrink-0 text-ink-muted" aria-hidden="true" />
  </component>
</template>
