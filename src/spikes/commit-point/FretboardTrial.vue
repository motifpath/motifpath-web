<script setup lang="ts">
/** P3: find the note on the real drill board, laid out and taking taps the way the variant says. */
import { CircleCheck, CircleX } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import { useAdvanceAfterAnswer } from '@/features/student/composables/useAdvanceAfterAnswer'
import DrillFretboard from '@/shared/components/diagram/DrillFretboard.vue'
import type { CellMark } from '@/shared/components/diagram/DrillFretboard.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { cellNoteName } from '@/shared/utils/fretboardCell'
import type { CellPlace } from '@/shared/utils/fretboardCell'
import type { Trial } from '@/spikes/commit-point/trialLog'
import { boardSetup, classifyTap } from '@/spikes/commit-point/variants'
import type { TapOutcome, Variant } from '@/spikes/commit-point/variants'

const GUITAR = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
const LAST_FRET = 12
const ALL_STRINGS = [1, 2, 3, 4, 5, 6]

const props = defineProps<{ cell: CellPlace; index: number; variant: Variant }>()
const emit = defineEmits<{ done: [trial: Trial] }>()

const setup = computed(() => boardSetup(props.variant))
const shownAt = performance.now()
const scrolled = ref(false)
const answer = ref<{ correct: boolean; outcome: TapOutcome; tapped: CellPlace; answerMs: number } | null>(null)

const prompt = computed(() => `Find ${(cellNoteName(GUITAR, props.cell) ?? '').replace('#', '♯')} on string ${props.cell.string}`)

const marks = computed<CellMark[]>(() => {
  if (!answer.value) return []
  const tapped = { ...answer.value.tapped, string: props.cell.string }
  if (answer.value.correct) return [{ ...tapped, mark: 'right' }]
  return [
    { ...tapped, mark: 'wrong' },
    { ...props.cell, mark: 'right' },
  ]
})

function tap(place: CellPlace) {
  if (answer.value) return
  // With any string counting, a tap is read as the asked string at the tapped fret.
  const tapped = setup.value.anyStringCounts ? { string: props.cell.string, fret: place.fret } : place
  const outcome = classifyTap(GUITAR, props.cell, tapped)
  answer.value = { correct: outcome === 'right', outcome, tapped: place, answerMs: performance.now() - shownAt }
}

const { next } = useAdvanceAfterAnswer(
  () => answer.value,
  () =>
    emit('done', {
      caseId: 'P3',
      variant: props.variant,
      itemKey: `${props.index}:${props.cell.string}/${props.cell.fret}`,
      answerMs: Math.round(answer.value?.answerMs ?? 0),
      outcome: answer.value?.outcome ?? 'wrong',
      scrolled: scrolled.value,
    }),
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <p class="text-lg font-semibold">{{ prompt }}</p>
    <div :class="setup.minColumnPx ? 'overflow-x-auto' : ''" @scroll.passive="scrolled = true">
      <div :class="setup.minColumnPx ? 'min-w-[606px]' : ''">
        <DrillFretboard
          :tuning="GUITAR"
          :max-fret="LAST_FRET"
          label="Fretboard"
          :asked-string="cell.string"
          :tap-strings="setup.anyStringCounts ? ALL_STRINGS : [cell.string]"
          :locked="answer !== null"
          :marks="marks"
          @tap="tap"
        />
      </div>
    </div>

    <PracticeActionBar>
      <template v-if="answer">
        <p role="status" class="flex items-center gap-1.5 text-base font-semibold" :class="answer.correct ? 'text-success' : 'text-danger'">
          <CircleCheck v-if="answer.correct" :size="22" aria-hidden="true" />
          <CircleX v-else :size="22" aria-hidden="true" />
          {{ answer.correct ? 'Right' : answer.outcome === 'adjacent' ? 'One fret off' : 'Not quite' }}
        </p>
        <PrimaryButton data-primary-action class="ml-auto h-12 px-6" @click="next">Next</PrimaryButton>
      </template>
    </PracticeActionBar>
  </div>
</template>
