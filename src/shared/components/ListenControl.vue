<script setup lang="ts">
/**
 * A listening exercise's sound played from a diagram, before the answer: Play, "Listen" with the
 * playback's name and tempo, and a tempo chip to slow it down. The diagram is never drawn or named
 * here, since that would give the answer away. It says when the sound starts and stops, so an
 * answer can be timed from the last sound heard, and when the sound can't be heard, so the holder
 * can lock the options and offer another try.
 */
import { LoaderCircle, Play, Square } from 'lucide-vue-next'
import { computed, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { components as EventComponents } from '@/api/generated/event-ingestion'
import DiagramTempo from '@/shared/components/diagram/DiagramTempo.vue'
import { useDiagramSound } from '@/shared/composables/useDiagramSound'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

type DiagramRef = components['schemas']['DiagramRef']
type MissingReason = EventComponents['schemas']['NotAnsweredResponse']['reason']

const props = defineProps<{ sound: DiagramRef }>()

const emit = defineEmits<{ playing: [playing: boolean]; missing: [reason: MissingReason] }>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
const { state, missing, played, soundTempo, tempo, toggle } = useDiagramSound(() => props.sound)

const sounding = computed(() => state.value === 'playing')
watch(sounding, (now) => emit('playing', now))
watch(missing, (reason) => {
  if (reason) emit('missing', reason)
})

const busy = computed(() => state.value === 'playing' || state.value === 'loading')
const description = computed(() =>
  played.value && soundTempo.value !== null
    ? t('listenControl.sound', { name: localizedName(played.value.names), bpm: soundTempo.value })
    : '',
)
</script>

<template>
  <div data-test="listen-control" class="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
    <button
      data-test="listen-play"
      type="button"
      class="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
      :aria-label="busy ? t('diagramPlayer.stop') : t('listenControl.listen')"
      :aria-busy="state === 'loading' ? 'true' : undefined"
      @click="toggle"
    >
      <LoaderCircle v-if="state === 'loading'" :size="24" class="animate-spin motion-reduce:animate-none" aria-hidden="true" />
      <Square v-else-if="state === 'playing'" :size="20" fill="currentColor" aria-hidden="true" />
      <Play v-else :size="24" aria-hidden="true" />
    </button>
    <div class="min-w-0 flex-1">
      <p class="text-base font-semibold text-ink">{{ t('listenControl.listen') }}</p>
      <p data-test="listen-sound" class="text-sm text-ink-muted">{{ description }}</p>
    </div>
    <DiagramTempo v-model="tempo" look="chip" />
  </div>
</template>
