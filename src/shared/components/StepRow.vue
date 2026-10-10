<script setup lang="ts">
/**
 * One step of a sequence: a state marker, the title, a meta line and a trailing icon. It knows
 * how each state looks, not what puts a step in it — the caller decides the state and writes the
 * meta line. With `to` the row is a link; without it, a button that emits `select` (a locked step
 * explains itself instead of opening).
 */
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

import Icon from '@/shared/components/Icon.vue'

export type StepRowState = 'done' | 'current' | 'open' | 'locked' | 'language'

const props = defineProps<{
  state: StepRowState
  position: number
  title: string
  meta: string
  to?: RouteLocationRaw
}>()
const emit = defineEmits<{ select: [] }>()

const MARKER_CLASS: Record<StepRowState, string> = {
  done: 'bg-success-muted text-success',
  current: 'bg-accent text-accent-fg',
  open: 'bg-surface-sunken text-ink',
  locked: 'bg-surface-sunken text-ink-muted',
  language: 'bg-warning-muted text-warning',
}

const META_CLASS: Record<StepRowState, string> = {
  done: 'text-ink-muted',
  current: 'text-accent-text',
  open: 'text-ink-muted',
  locked: 'text-ink-muted',
  language: 'text-warning',
}

const isLocked = computed(() => props.state === 'locked' || props.state === 'language')
</script>

<template>
  <li>
    <component
      :is="to ? RouterLink : 'button'"
      data-test="step-row"
      :to="to"
      :type="to ? undefined : 'button'"
      :aria-current="state === 'current' ? 'step' : undefined"
      class="flex min-h-14 w-full items-center gap-3 rounded-lg px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      :class="state === 'current' ? 'bg-accent-muted' : 'hover:bg-surface-sunken'"
      @click="to ? undefined : emit('select')"
    >
      <span
        data-test="step-marker"
        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums"
        :class="MARKER_CLASS[state]"
      >
        <Icon v-if="state === 'done'" name="check" :size="16" />
        <Icon v-else-if="state === 'language'" name="language" :size="16" />
        <template v-else>{{ position }}</template>
      </span>
      <span class="flex min-w-0 flex-1 flex-col">
        <span class="text-base" :class="[isLocked ? 'text-ink-muted' : 'text-ink', state === 'current' && 'font-semibold']">{{ title }}</span>
        <span data-test="step-meta" class="text-xs" :class="META_CLASS[state]">{{ meta }}</span>
      </span>
      <span v-if="isLocked" data-test="step-lock" class="shrink-0 text-ink-muted"><Icon name="locked" :size="18" /></span>
      <span v-else class="shrink-0" :class="state === 'current' ? 'text-accent-text' : 'text-ink-muted'"><Icon name="chevron-right" :size="18" /></span>
    </component>
  </li>
</template>
