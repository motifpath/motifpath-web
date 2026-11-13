<script setup lang="ts">
/**
 * One chord to play clean on guitar, instrument in hand: its box, the chord named, since playing it
 * is the skill. The student plays it and rates how it sounded in the action bar; the rating is the
 * answer. A chord that can't be drawn here can only be skipped, as not answered.
 */
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { NotAnsweredReason } from '@/features/student/composables/usePracticeSessionRun'
import { useChordBoxes } from '@/features/student/composables/useChordBoxes'
import ItemHeader from '@/features/student/components/ItemHeader.vue'
import SelfRating from '@/features/student/components/SelfRating.vue'
import type { TakeRating } from '@/features/student/utils/tempoLadder'
import ChordBox from '@/shared/components/diagram/ChordBox.vue'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

type Item = components['schemas']['PracticeSessionItem']

const props = defineProps<{
  /** A chord_voicing item. */
  item: Item
  /** The instrument the item is on, named only in a session mixing instruments. */
  instrumentName?: string
}>()

const emit = defineEmits<{ rate: [rating: TakeRating]; skip: [reason: NotAnsweredReason] }>()

const { t } = useTypedT()

/** A chord box is drawn this much bigger than its own size, to be read with the instrument in hand. */
const BOX_SCALE = 1.5

const symbol = computed(() => props.item.chord_voicing?.chord_symbol ?? '')
const title = computed(() => t('sessionPlan.chords.voicing', { chord: symbol.value }))

const chord = useChordBoxes(() => (props.item.chord_voicing ? [props.item.chord_voicing.diagram_id] : []))
const box = computed(() => chord.boxes.value[0] ?? null)

const status = computed(() => chord.status.value)
</script>

<template>
  <div class="flex flex-col gap-4" data-test="session-chord-voicing">
    <LoadingSkeleton v-if="status === 'loading'" />

    <template v-else-if="status === 'unavailable'">
      <InlineNotice tone="unavailable" :message="t('sessionChord.unavailable')" />
      <PracticeActionBar>
        <PrimaryButton data-test="skip-item" data-primary-action class="h-12 w-full" @click="emit('skip', 'unavailable')">
          {{ t('sessionChord.skip') }}
        </PrimaryButton>
      </PracticeActionBar>
    </template>

    <template v-else>
      <p v-if="instrumentName" data-test="item-instrument" class="-mb-2 text-sm font-medium text-ink-muted">{{ instrumentName }}</p>
      <ItemHeader :title="title" :reason="item.reason" />
      <p data-test="chord-hint" class="text-ink-muted">{{ t('sessionChord.voicingHint') }}</p>

      <div v-if="box && chord.instrument.value" data-test="chord-box" class="flex justify-center">
        <ChordBox :voicing="box.voicing" :diagram="box.diagram" :instrument="chord.instrument.value" :label="symbol" :scale="BOX_SCALE" />
      </div>

      <SelfRating :chord="symbol" @rate="emit('rate', $event)" />
    </template>
  </div>
</template>
