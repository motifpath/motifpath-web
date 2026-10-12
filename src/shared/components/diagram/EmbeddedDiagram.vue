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
 * it, so it doesn't pick an option. A stack never plays; its diagrams are named in a legend.
 * A diagram with chord data (a chord voicing's) is drawn as a chord box, read in place, with
 * Box | Neck to switch for this showing. A chord whose cells are answers is answered on its box,
 * and a thumbnail is its box fitted to the card; neither offers the switch. `root_override` isn't applied yet: the diagram is drawn, and played,
 * as authored.
 */
import { computed, shallowRef, watch } from 'vue'

import ChordBox from '@/shared/components/diagram/ChordBox.vue'
import ChordViewSwitch from '@/shared/components/diagram/ChordViewSwitch.vue'
import DiagramLegend from '@/shared/components/diagram/DiagramLegend.vue'
import DiagramPlayer, { PLAYER_WIDTH } from '@/shared/components/diagram/DiagramPlayer.vue'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import type { AnswerMarkKind } from '@/shared/components/diagram/AnswerMark.vue'
import type { AnswerCell } from '@/shared/components/diagram/FrettedDiagramView.vue'
import { useChordView } from '@/shared/composables/useChordView'
import { isPlayable } from '@/shared/composables/useDiagramPlayback'
import { useEmbeddedDiagram } from '@/shared/composables/useEmbeddedDiagram'
import type { EmbeddedDiagramStatus } from '@/shared/composables/useEmbeddedDiagram'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
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
    /** The positions a player outside the diagram is sounding, to light up. Given, the diagram
     *  offers no Play of its own. */
    activePositionIds?: string[]
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
    activePositionIds: undefined,
  },
)

const emit = defineEmits<{
  select: [positionId: string]
  selectAnswer: [optionId: string]
  /** Whether the diagram is still loading, shown, or can't be shown to a student. */
  status: [status: EmbeddedDiagramStatus]
}>()

const { t } = useTypedT()
const { status, failed, diagram, instrument, diagramRef, labelMode, legend, retry } = useEmbeddedDiagram(() => props.embed)
watch(status, (next) => emit('status', next), { immediate: true })

const heardPositionIds = shallowRef<string[]>([])
/** The positions to light up: an outside player's when one is given, else the diagram's own. */
const litPositionIds = computed(() => props.activePositionIds ?? heardPositionIds.value)

const { localizedName } = useLocalizedName()
const takesTaps = computed(() => props.selectablePositionIds.length > 0 || props.answerCells.length > 0)
const isChord = computed(() => props.embed.kind === 'single' && Boolean(diagram.value?.chord_voicing))
// A chord being answered, or a thumbnail, is always its box: there's no switch to offer there.
const fixedBox = computed(() => isChord.value && (props.compact || takesTaps.value))
const chordView = useChordView(() => (isChord.value && !fixedBox.value ? diagram.value : null))
const showsBox = computed(() => fixedBox.value || (isChord.value && chordView.view.value === 'box'))
const hiddenPositionIds = computed(() => diagramRef.value?.layers.hidden_position_ids ?? [])

// The rail keeps room for the player only when there is something to play, and no player outside
// the diagram plays it instead.
const playable = computed(
  () =>
    props.activePositionIds === undefined &&
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
    <div v-if="chordView.canSwitch.value" class="flex items-center gap-3">
      <ChordViewSwitch :model-value="chordView.view.value" @update:model-value="chordView.choose" />
      <DiagramPlayer
        v-if="chordView.view.value === 'box' && playable"
        :diagram="diagram"
        :instrument="instrument"
        :playback="diagramRef.playback ?? null"
        @active="heardPositionIds = $event"
      />
    </div>
    <div data-test="embedded-diagram-drawing">
      <ChordBox
        v-if="showsBox && diagram.chord_voicing"
        :voicing="diagram.chord_voicing"
        :diagram="diagram"
        :instrument="instrument"
        :label="localizedName(diagram.names)"
        :scale="2"
        :fit="props.compact"
        :aria-hidden="props.inert ? 'true' : undefined"
        :active-position-ids="litPositionIds"
        :hidden-position-ids="hiddenPositionIds"
        :selectable-position-ids="props.selectablePositionIds"
        :answer-cells="props.answerCells"
        :selected-answer-ids="props.selectedAnswerIds"
        :answer-marks="props.answerMarks"
        :multiple="props.multiple"
        @select="emit('select', $event)"
        @select-answer="emit('selectAnswer', $event)"
      />
      <FrettedDiagramView
        v-else
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
        :active-position-ids="litPositionIds"
        :compact="props.compact"
        :drawing-inert="props.inert"
        :controls-width="playable ? PLAYER_WIDTH : 0"
        @select="emit('select', $event)"
        @select-answer="emit('selectAnswer', $event)"
      >
        <template #controls>
          <DiagramPlayer
            v-if="playable"
            :diagram="diagram"
            :instrument="instrument"
            :playback="diagramRef.playback ?? null"
            @active="heardPositionIds = $event"
          />
        </template>
      </FrettedDiagramView>
    </div>
    <!-- A tap on Play never reaches the card around a thumbnail, so it doesn't pick an option. -->
    <div v-if="fixedBox && playable && diagramRef" data-test="chord-box-player" class="flex" @click.stop @keydown.stop>
      <DiagramPlayer
        :diagram="diagram"
        :instrument="instrument"
        :playback="diagramRef.playback ?? null"
        @active="heardPositionIds = $event"
      />
    </div>
    <DiagramLegend v-if="legend.length > 1" :entries="legend" />
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
