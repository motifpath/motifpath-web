<script setup lang="ts">
/**
 * One bar of a cadence or progression a drill plays. A bar the question gives shows its label
 * (a numeral of the cadence); the bar asked shows only "?", never its name, on screen or to a
 * screen reader. Each bar follows the playing: played, sounding now, or still to come.
 */
import { computed } from 'vue'

import { useTypedT } from '@/shared/composables/useTypedT'

export type BarPhase = 'played' | 'current' | 'upcoming'

const props = defineProps<{
  /** What the bar shows; null for the bar asked. */
  label: string | null
  /** The bar's place in the progression, from 1. */
  position: number
  phase: BarPhase
}>()

const { t } = useTypedT()

const asked = computed(() => props.label === null)

const look = computed(() => {
  if (props.phase === 'current') return 'bg-accent text-accent-fg'
  if (asked.value) return 'border-[1.5px] border-dashed border-ink-subtle bg-surface text-ink-subtle'
  if (props.phase === 'played') return 'bg-surface-sunken text-ink-muted'
  return 'border-[1.5px] border-border bg-surface text-ink'
})

const name = computed(() =>
  props.label === null ? t('drill.player.askedBar', { position: props.position }) : t('drill.player.givenBar', { position: props.position, label: props.label }),
)
</script>

<template>
  <li
    data-test="bar-cell"
    :data-phase="phase"
    :aria-label="name"
    :aria-current="phase === 'current' ? 'step' : undefined"
    class="flex h-11 min-w-0 flex-1 items-center justify-center rounded-md text-sm font-semibold"
    :class="look"
  >
    {{ label ?? '?' }}
  </li>
</template>
