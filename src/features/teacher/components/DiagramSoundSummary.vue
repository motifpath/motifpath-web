<script setup lang="ts">
/**
 * A sound played from a diagram, summed up for its author: the diagram and playback it plays,
 * "From a diagram · tempo · length", and ▶ to hear it as students do.
 */
import { AudioLines, Play, Square } from 'lucide-vue-next'
import { computed } from 'vue'

import { useDiagramSound } from '@/shared/composables/useDiagramSound'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'
import { diagramSoundSeconds } from '@/shared/utils/exerciseAudio'
import type { components } from '@/api/generated/core-domain'

type DiagramRef = components['schemas']['DiagramRef']

const props = defineProps<{ sound: DiagramRef }>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
const { state, diagram, played, soundTempo, toggle } = useDiagramSound(() => props.sound)

const busy = computed(() => state.value === 'playing' || state.value === 'loading')
const title = computed(() =>
  diagram.value && played.value
    ? t('soundSource.diagramTitle', { diagram: localizedName(diagram.value.names), playback: localizedName(played.value.names) })
    : '',
)
const meta = computed(() => {
  if (!diagram.value || soundTempo.value === null) return ''
  const seconds = Math.round(diagramSoundSeconds(diagram.value, props.sound) ?? 0)
  const length = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  return t('soundSource.diagramMeta', { bpm: soundTempo.value, length })
})
</script>

<template>
  <span class="flex size-14 shrink-0 items-center justify-center rounded-[0.625rem] bg-accent-muted text-accent" aria-hidden="true">
    <AudioLines :size="24" />
  </span>
  <span class="flex min-w-0 flex-1 flex-col gap-0.5">
    <span data-test="sound-source-title" class="break-words text-sm font-semibold text-ink">{{ title }}</span>
    <span data-test="sound-source-meta" class="text-xs font-medium text-ink-muted">{{ meta }}</span>
  </span>
  <button
    type="button"
    data-test="sound-source-play"
    class="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    :aria-label="busy ? t('soundSource.stop') : t('soundSource.play')"
    @click="toggle"
  >
    <Square v-if="busy" :size="16" fill="currentColor" aria-hidden="true" />
    <Play v-else :size="20" aria-hidden="true" />
  </button>
</template>
