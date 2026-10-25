<script setup lang="ts">
/**
 * Today's plan, before a session's first item: what the session holds, in order, and why each
 * was picked, so the student knows what they're about to practise. Let's go starts the session.
 *
 * The plan names its subjects, main first, each with the rungs its new items come from; a session
 * the student chose says so once, above its one subject. In Today's mix, due items of other
 * subjects come as their own quick review, right after the warm-up, before the subjects' items.
 */
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import PlanRowLine from '@/features/student/components/PlanRow.vue'
import { planSections, planSubjects } from '@/features/student/utils/focusPlan'
import type { PlanSection } from '@/features/student/utils/focusPlan'
import { planRows } from '@/features/student/utils/planRows'
import type { PlanRow } from '@/features/student/utils/planRows'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

type Item = components['schemas']['PracticeSessionItem']
type FocusNode = components['schemas']['PracticeFocusNode']
type FocusSource = components['schemas']['PracticeFocusSource']
type Rung = components['schemas']['PracticeRung']

const props = withDefaults(
  defineProps<{
    items: Item[]
    minutes: number
    /** The instrument in the student's hands, or how a session in the head is called. */
    instrumentName: string
    /** What to call an item on screen. */
    labelOf: (item: Item) => string
    /** Whether the composer or the student picked the subjects. */
    focusSource?: FocusSource
    /** The session's subjects, main first. */
    focusNodes?: FocusNode[]
  }>(),
  { focusSource: 'suggested', focusNodes: () => [] },
)

const emit = defineEmits<{ start: [] }>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()

const plan = computed(() => ({ items: props.items, focus_source: props.focusSource, focus_nodes: props.focusNodes }))
const subjects = computed(() => planSubjects(plan.value))

/** Each group with its lines, numbered on from the group before. */
const sections = computed(() => {
  let numbered = 0
  return planSections(plan.value).map((section) => {
    const rows = planRows(section.positions.map((position) => props.items[position]))
    const first = numbered + 1
    numbered += rows.length
    return { ...section, rows, first }
  })
})
const hasReview = computed(() => sections.value.some((section) => section.kind === 'review'))

function sectionTitle(kind: PlanSection['kind']): string | null {
  if (kind === 'review') return t('sessionPlan.review')
  if (kind === 'subjects' && hasReview.value) return t('sessionPlan.yourSubjects')
  return null
}

function rungNames(rungs: Rung[]): string {
  return rungs.map((rung) => t(`sessionPlan.rungs.${rung}`)).join(' · ')
}

function rowName(row: PlanRow): string {
  const label = props.labelOf(row.item)
  if (row.cellCount !== undefined) return t('sessionPlan.cells', { drill: label, count: row.cellCount })
  if (row.shapeCount !== undefined) return t('sessionPlan.shapes', { drill: label, count: row.shapeCount })
  return label
}

const HEADING = 'text-xs font-semibold uppercase tracking-wide text-accent-text'
</script>

<template>
  <section class="flex flex-col gap-4" data-test="todays-plan">
    <header class="flex items-baseline justify-between gap-2">
      <h1 class="text-xl font-semibold">{{ t('sessionPlan.title') }}</h1>
      <span data-test="plan-meta" class="shrink-0 text-sm text-ink-muted">{{ t('sessionPlan.meta', { minutes, instrument: instrumentName }) }}</span>
    </header>

    <section v-if="subjects.length > 0" class="flex flex-col gap-1.5">
      <h2 data-test="plan-subjects-label" :class="HEADING">
        {{ focusSource === 'chosen' ? t('sessionPlan.youChoseThis') : t('sessionPlan.today') }}
      </h2>
      <ul class="flex flex-col gap-1">
        <li v-for="subject in subjects" :key="subject.node.node_id" data-test="plan-subject" class="flex items-baseline gap-2.5">
          <span class="size-2 shrink-0 translate-y-[-1px] rounded-full bg-accent" aria-hidden="true" />
          <span data-test="plan-subject-name" class="min-w-0 flex-1 text-sm font-medium text-ink">{{ localizedName(subject.node.names) }}</span>
          <span data-test="plan-subject-rungs" class="shrink-0 text-xs text-ink-muted">{{ rungNames(subject.rungs) }}</span>
        </li>
      </ul>
    </section>

    <section v-for="section in sections" :key="section.kind" data-test="plan-section" :data-kind="section.kind" class="flex flex-col gap-2">
      <h2 v-if="sectionTitle(section.kind)" data-test="plan-section-title" :class="HEADING">{{ sectionTitle(section.kind) }}</h2>
      <ol class="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface-raised">
        <PlanRowLine
          v-for="(row, index) in section.rows"
          :key="row.key"
          :position="section.first + index"
          :name="rowName(row)"
          :reason="row.item.reason"
          :kind="row.item.kind"
          :progression-key="row.item.song?.progression_key"
        />
      </ol>
    </section>

    <PracticeActionBar>
      <PrimaryButton data-test="lets-go" data-primary-action class="h-12 w-full" @click="emit('start')">
        {{ t('sessionPlan.start') }}
      </PrimaryButton>
    </PracticeActionBar>
  </section>
</template>
