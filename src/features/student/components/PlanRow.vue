<script setup lang="ts">
/**
 * One line of today's plan: its place in the session, what it is called and why it was picked,
 * and on the right what kind of item it is, in a short label that fits beside a long name.
 */
import type { components } from '@/api/generated/core-domain'
import { pickReasonKeys } from '@/features/student/utils/pickReason'
import { useTypedT } from '@/shared/composables/useTypedT'

type Item = components['schemas']['PracticeSessionItem']

defineProps<{
  position: number
  name: string
  reason: Item['reason']
  kind: Item['kind']
}>()

const KIND_KEYS = {
  exercise: 'sessionPlan.kinds.exercise',
  play_along: 'sessionPlan.kinds.playAlong',
  fretboard_cell: 'sessionPlan.kinds.fretboard',
  diagram_shape: 'sessionPlan.kinds.fretboard',
  chord_change: 'sessionPlan.kinds.chordChange',
  diatonic_chord: 'sessionPlan.kinds.harmony',
  chord_function: 'sessionPlan.kinds.harmony',
  chart_progression: 'sessionPlan.kinds.harmony',
  heard_chord: 'sessionPlan.kinds.ear',
  heard_progression: 'sessionPlan.kinds.ear',
  chord_voicing: 'sessionPlan.kinds.chord',
  root_fifth: 'sessionPlan.kinds.chord',
  root_change: 'sessionPlan.kinds.chordChange',
  guide_tone: 'sessionPlan.kinds.guideTones',
  fretboard_note: 'sessionPlan.kinds.fretboard',
} as const satisfies Record<Item['kind'], string>

const { t } = useTypedT()
</script>

<template>
  <li data-test="plan-row" class="flex items-center gap-3 px-4 py-3">
    <span data-test="plan-row-position" class="w-5 shrink-0 text-right text-sm tabular-nums text-ink-subtle">{{ position }}</span>
    <div class="flex min-w-0 flex-1 flex-col">
      <span data-test="plan-row-name" class="font-medium">{{ name }}</span>
      <span data-test="plan-row-reason" class="text-xs text-ink-muted">{{ t(pickReasonKeys[reason]) }}</span>
    </div>
    <span data-test="plan-row-kind" class="shrink-0 text-xs text-ink-muted">{{ t(KIND_KEYS[kind]) }}</span>
  </li>
</template>
