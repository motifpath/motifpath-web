<script setup lang="ts">
/**
 * A prebuilt diagram embedded in what a student studies — a video cue, an
 * inline `diagram` node, or an exercise's stimulus or option thumbnail. It
 * loads the diagram itself, holds its space while loading, and shows nothing
 * at all (its caption included) when the diagram can't be shown, since a
 * student can do nothing about it — unless the caller fills the `unavailable`
 * slot.
 *
 * A single diagram whose usage offers playback gets compact Play and tempo
 * controls in the diagram's own control rail, an inert thumbnail's included:
 * only the drawing is inert, and a tap on them never reaches the card around
 * it, so it doesn't pick an option. A stack never plays. `root_override` isn't applied yet: the diagram is drawn, and played,
 * as authored.
 */
import { computed, shallowRef, watch } from 'vue'

import DiagramPlayer, { PLAYER_WIDTH } from '@/shared/components/diagram/DiagramPlayer.vue'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import type { AnswerMarkKind } from '@/shared/components/diagram/AnswerMark.vue'
import type { AnswerCell } from '@/shared/components/diagram/FrettedDiagramView.vue'
import { isPlayable } from '@/shared/composables/useDiagramPlayback'
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
    /** A graded answer's marks, passed through to the viewer. */
    answerMarks?: Record<string, AnswerMarkKind>
    positionMarks?: Record<string, AnswerMarkKind>
    multiple?: boolean
    /** The drawing is a picture only, such as an option thumbnail whose card handles the click:
     *  no pointer or keyboard input reaches it, and screen readers skip it. Play and the regions'
     *  information controls still work. */
    inert?: boolean
    /** Scale a plain drawing to fit, for a small card, instead of a readable board that may scroll. */
    compact?: boolean
    /** A failed load says so in place and offers Try again, for a diagram the student is reading
     *  around: a lesson's text would otherwise have a silent gap. */
    retryable?: boolean
  }>(),
  {
    selectablePositionIds: () => [],
    selectedPositionIds: () => [],
    answerCells: () => [],
    selectedAnswerIds: () => [],
    answerMarks: () => ({}),
    positionMarks: () => ({}),
    multiple: false,
    inert: false,
    compact: false,
    retryable: false,
  },
)

const emit = defineEmits<{
  select: [positionId: string]
  selectAnswer: [optionId: string]
  /** Whether the diagram is still loading, shown, or can't be shown to a student. */
  status: [status: EmbeddedDiagramStatus]
}>()

const { t } = useTypedT()
const { status, failed, diagram, instrument, diagramRef, labelMode, retry } = useEmbeddedDiagram(() => props.embed)
watch(status, (next) => emit('status', next), { immediate: true })

const activePositionIds = shallowRef<string[]>([])

// The rail keeps room for the player only when there is something to play.
const playable = computed(
  () =>
    props.embed.kind === 'single' &&
    diagram.value !== null &&
    instrument.value !== null &&
    diagramRef.value !== null &&
    isPlayable({ diagram: diagram.value, instrument: instrument.value, playback: diagramRef.value.playback ?? null }),
)
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
  >
    <div data-test="embedded-diagram-drawing">
      <FrettedDiagramView
        :diagram="diagram"
        :instrument="instrument"
        :diagram-ref="diagramRef"
        :label-mode="labelMode"
        :selectable-position-ids="props.selectablePositionIds"
        :selected-position-ids="props.selectedPositionIds"
        :answer-cells="props.answerCells"
        :selected-answer-ids="props.selectedAnswerIds"
        :answer-marks="props.answerMarks"
        :position-marks="props.positionMarks"
        :multiple="props.multiple"
        :active-position-ids="activePositionIds"
        :compact="props.compact"
        :drawing-inert="props.inert"
        :controls-width="playable ? PLAYER_WIDTH : 0"
        @select="emit('select', $event)"
        @select-answer="emit('selectAnswer', $event)"
      >
        <template #controls>
          <DiagramPlayer
            :diagram="diagram"
            :instrument="instrument"
            :playback="diagramRef.playback ?? null"
            @active="activePositionIds = $event"
          />
        </template>
      </FrettedDiagramView>
    </div>
    <figcaption v-if="props.caption" class="text-sm text-ink-muted">{{ props.caption }}</figcaption>
  </figure>
  <LoadFailed
    v-else-if="status === 'unavailable' && failed && props.retryable"
    data-test="embedded-diagram-failed"
    :message="t('embeddedDiagram.loadFailed')"
    @retry="retry()"
  />
  <slot v-else-if="status === 'unavailable'" name="unavailable" />
</template>
