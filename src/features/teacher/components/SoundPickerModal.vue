<script setup lang="ts">
/**
 * Chooses a listening exercise's sound from a diagram, in its own modal: first a diagram that can
 * play (or a chord's voicing, a tab away), then how it plays (SoundSettings). "Use this sound"
 * hands the sound back. A sound being edited opens on its settings. A full-screen layer on a
 * phone, else a fixed-height dialog, with Cancel always at its foot.
 */
import { ChevronLeft } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

import ChordVoicingPickerList from '@/features/teacher/components/ChordVoicingPickerList.vue'
import DiagramPickerList from '@/features/teacher/components/DiagramPickerList.vue'
import SoundSettings from '@/features/teacher/components/SoundSettings.vue'
import { useStimulusDiagram } from '@/features/teacher/composables/useStimulusDiagram'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type DiagramRef = components['schemas']['DiagramRef']

const props = defineProps<{
  open: boolean
  /** The sound being edited; null to choose a new one. */
  initial: DiagramRef | null
}>()
const emit = defineEmits<{ apply: [sound: DiagramRef]; close: [] }>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()

const source = ref<'diagrams' | 'chords'>('diagrams')
const pickedId = ref<string | null>(null)
const step = ref<'choose' | 'set'>('choose')
/** The settings' sound, or null while it can't be played. */
const sound = ref<DiagramRef | null>(null)

const picked = useStimulusDiagram(pickedId)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    pickedId.value = props.initial?.diagram_id ?? null
    step.value = props.initial ? 'set' : 'choose'
    source.value = 'diagrams'
    sound.value = null
  },
  { immediate: true },
)

/** The settings start from the sound being edited only while it's still its diagram. */
const initialForPick = computed(() => (props.initial && props.initial.diagram_id === pickedId.value ? props.initial : null))

function choose(diagram: Diagram) {
  pickedId.value = diagram.diagram_id
  if (diagram.purpose === 'chord_voicing') source.value = 'chords'
  step.value = 'set'
}

function use() {
  if (sound.value) emit('apply', sound.value)
}
</script>

<template>
  <ModalOverlay
    :open="open"
    panel-class="fixed inset-0 flex flex-col gap-4 bg-surface-raised px-4 pb-safe-4 pt-safe-top-4 sm:static sm:h-[85vh] sm:w-[720px] sm:max-w-[92vw] sm:rounded-xl sm:p-5 sm:shadow-level2"
    @close="emit('close')"
  >
    <div class="flex items-center justify-between gap-2">
      <button
        v-if="step === 'set'"
        type="button"
        data-test="sound-picker-change"
        class="flex h-11 items-center gap-1 text-sm font-semibold text-accent-text"
        @click="step = 'choose'"
      >
        <ChevronLeft :size="18" aria-hidden="true" />
        {{ source === 'chords' ? t('soundPicker.changeChord') : t('soundPicker.changeDiagram') }}
      </button>
      <span v-else data-test="sound-picker-title" class="text-base font-bold">{{ t('soundPicker.title') }}</span>
      <ModalCloseButton @close="emit('close')" />
    </div>

    <div v-show="step === 'choose'" class="flex min-h-0 flex-1 flex-col gap-3">
      <div class="flex w-fit shrink-0 gap-1 rounded-lg bg-surface-sunken p-1" role="group" :aria-label="t('soundPicker.sourceLabel')">
        <button
          type="button"
          data-test="sound-picker-source-diagrams"
          :aria-pressed="source === 'diagrams'"
          class="rounded-md px-3 py-1 text-xs font-semibold"
          :class="source === 'diagrams' ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="source = 'diagrams'"
        >
          {{ t('soundPicker.sourceDiagrams') }}
        </button>
        <button
          type="button"
          data-test="sound-picker-source-chords"
          :aria-pressed="source === 'chords'"
          class="rounded-md px-3 py-1 text-xs font-semibold"
          :class="source === 'chords' ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="source = 'chords'"
        >
          {{ t('soundPicker.sourceChords') }}
        </button>
      </div>
      <ChordVoicingPickerList v-if="source === 'chords'" :picked-diagram-id="pickedId" @select="choose" />
      <DiagramPickerList v-else playable :picked-diagram-id="pickedId" @select="choose" />
    </div>

    <div v-if="step === 'set'" class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <LoadingSkeleton v-if="picked.status.value === 'loading'" />
      <template v-else-if="picked.status.value === 'ready' && picked.diagram.value && picked.instrument.value">
        <h2 data-test="sound-picker-name" class="text-base font-semibold text-ink">{{ localizedName(picked.diagram.value.names) }}</h2>
        <SoundSettings
          :key="picked.diagram.value.diagram_id"
          :diagram="picked.diagram.value"
          :instrument="picked.instrument.value"
          :initial="initialForPick"
          @change="sound = $event"
        />
      </template>
      <LoadFailed
        v-else-if="picked.status.value === 'error'"
        data-test="sound-picker-load-error"
        :message="t('soundPicker.loadFailed')"
        @retry="picked.retry"
      />
      <p v-else-if="picked.status.value === 'unavailable'" class="text-sm text-ink-muted">{{ t('soundPicker.unavailable') }}</p>
    </div>

    <div class="flex justify-end gap-2 border-t border-border pt-4">
      <button
        type="button"
        data-test="sound-picker-cancel"
        class="h-11 rounded-md border border-border bg-surface-raised px-4 text-sm font-semibold"
        @click="emit('close')"
      >
        {{ t('soundPicker.cancel') }}
      </button>
      <button
        v-if="step === 'set'"
        type="button"
        data-test="sound-picker-use"
        :disabled="!sound"
        class="h-11 rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg disabled:cursor-not-allowed disabled:opacity-60"
        @click="use"
      >
        {{ t('soundPicker.use') }}
      </button>
    </div>
  </ModalOverlay>
</template>
