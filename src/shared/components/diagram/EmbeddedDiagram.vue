<script setup lang="ts">
/**
 * A prebuilt diagram embedded in what a student studies — a video cue, an
 * inline `diagram` node, or an exercise's stimulus or option thumbnail. It
 * loads the diagram itself, holds its space while loading, and shows nothing
 * at all (its caption included) when the diagram can't be shown, since a
 * student can do nothing about it — unless the caller fills the `unavailable`
 * slot.
 *
 * A single diagram whose usage offers playback gets a Play control; a stack
 * never plays, and an inert thumbnail has no controls. `root_override` isn't
 * applied yet: the diagram is drawn, and played, as authored.
 */
import { shallowRef, watch } from 'vue'

import DiagramPlayer from '@/shared/components/diagram/DiagramPlayer.vue'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import type { AnswerCell } from '@/shared/components/diagram/FrettedDiagramView.vue'
import { useEmbeddedDiagram } from '@/shared/composables/useEmbeddedDiagram'
import type { EmbeddedDiagramStatus } from '@/shared/composables/useEmbeddedDiagram'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { DiagramEmbed } from '@/shared/utils/diagramEmbed'

const props = withDefaults(
  defineProps<{
    embed: DiagramEmbed
    caption?: string
    /** Answer choices, passed through to the viewer. */
    selectablePositionIds?: string[]
    selectedPositionIds?: string[]
    /** Fretboard cells as answer choices, passed through to the viewer. */
    answerCells?: AnswerCell[]
    selectedAnswerIds?: string[]
    multiple?: boolean
    /** A picture only, such as an option thumbnail whose card handles the click: no pointer or
     *  keyboard input reaches it, and screen readers skip it. */
    inert?: boolean
  }>(),
  {
    selectablePositionIds: () => [],
    selectedPositionIds: () => [],
    answerCells: () => [],
    selectedAnswerIds: () => [],
    multiple: false,
    inert: false,
  },
)

const emit = defineEmits<{
  select: [positionId: string]
  selectAnswer: [optionId: string]
  /** Whether the diagram is still loading, shown, or can't be shown to a student. */
  status: [status: EmbeddedDiagramStatus]
}>()

const { t } = useTypedT()
const { status, diagram, instrument, diagramRef, labelMode } = useEmbeddedDiagram(() => props.embed)
watch(status, (next) => emit('status', next), { immediate: true })

const activePositionIds = shallowRef<string[]>([])
</script>

<template>
  <div
    v-if="status === 'loading'"
    data-test="embedded-diagram-loading"
    role="status"
    :aria-label="t('states.loading')"
    class="aspect-[12/5] w-full animate-pulse rounded-lg bg-surface-sunken"
  />
  <figure
    v-else-if="status === 'ready' && diagram && instrument && diagramRef"
    data-test="embedded-diagram"
    class="flex flex-col gap-2"
    :inert="props.inert || undefined"
  >
    <FrettedDiagramView
      :diagram="diagram"
      :instrument="instrument"
      :diagram-ref="diagramRef"
      :label-mode="labelMode"
      :selectable-position-ids="props.selectablePositionIds"
      :selected-position-ids="props.selectedPositionIds"
      :answer-cells="props.answerCells"
      :selected-answer-ids="props.selectedAnswerIds"
      :multiple="props.multiple"
      :active-position-ids="activePositionIds"
      @select="emit('select', $event)"
      @select-answer="emit('selectAnswer', $event)"
    />
    <DiagramPlayer
      v-if="props.embed.kind === 'single' && !props.inert"
      :diagram="diagram"
      :instrument="instrument"
      :playback="diagramRef.playback ?? null"
      @active="activePositionIds = $event"
    />
    <figcaption v-if="props.caption" class="text-sm text-ink-muted">{{ props.caption }}</figcaption>
  </figure>
  <slot v-else-if="status === 'unavailable'" name="unavailable" />
</template>
