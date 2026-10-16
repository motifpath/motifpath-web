<script setup lang="ts">
/**
 * The tempo of a progression a drill plays, as a chip beside its Play: a tap opens Tempo, the
 * same metronome row as every practice screen, starting at the level's tempo, with the suggested
 * note values. In eighths the progression plays twice as fast, two chords a bar, over the same
 * click. Its bar is 4/4, one chord a bar, shown locked. A sheet on a phone, a dialog on anything
 * wider; Done closes it, and nothing chosen is kept past this showing.
 */
import { Metronome } from 'lucide-vue-next'
import { ref } from 'vue'

import LockedTimeSignature from '@/shared/components/LockedTimeSignature.vue'
import OverlayPanel from '@/shared/components/OverlayPanel.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import TempoControl from '@/shared/components/TempoControl.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { MIN_TEMPO_BPM } from '@/shared/utils/sequence'
import { SUGGESTED_NOTE_VALUES } from '@/shared/utils/tempoNoteValue'
import type { TempoNoteValue } from '@/shared/utils/tempoNoteValue'

const tempo = defineModel<number>('tempo', { required: true })
const noteValue = defineModel<TempoNoteValue>('noteValue', { required: true })
/** Whether the progression plays over a click. */
const metronome = defineModel<boolean>('metronome', { required: true })

const { t } = useTypedT()

const open = ref(false)
</script>

<template>
  <button
    type="button"
    data-test="progression-tempo"
    class="flex h-11 items-center gap-1 rounded-full border border-border bg-surface px-3 text-sm font-semibold tabular-nums text-ink hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
    :aria-label="t('diagramPlayer.tempoControl', { bpm: tempo })"
    :title="t('diagramPlayer.tempoControl', { bpm: tempo })"
    aria-haspopup="dialog"
    :aria-expanded="open ? 'true' : 'false'"
    @click="open = true"
  >
    <Metronome :size="16" aria-hidden="true" />
    <span aria-hidden="true">{{ tempo }}</span>
  </button>

  <OverlayPanel :open="open" :title="t('diagramPlayer.tempo')" @close="open = false">
    <div class="flex flex-col gap-4">
      <TempoControl
        :tempo="tempo"
        :slowest="MIN_TEMPO_BPM"
        :goal="null"
        :best="null"
        :metronome="metronome"
        :disabled="false"
        :note-value="noteValue"
        :note-values="SUGGESTED_NOTE_VALUES"
        @tempo="tempo = $event"
        @update:metronome="metronome = $event"
        @update:note-value="noteValue = $event"
      />
      <LockedTimeSignature :signature="{ beats: 4, beat_value: 4 }" set-by="progression" />
    </div>
    <template #actions>
      <PrimaryButton data-test="progression-tempo-done" class="h-12 w-full" @click="open = false">{{ t('progressionTempo.done') }}</PrimaryButton>
    </template>
  </OverlayPanel>
</template>
