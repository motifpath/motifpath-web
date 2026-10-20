<script setup lang="ts">
/**
 * After a listening exercise is answered, the diagram its sound was played from: named, drawn, and
 * played again on demand, each position lighting up while it sounds. It plays only the playback the
 * exercise used. Nothing shows while the diagram isn't there.
 */
import { Play, Square } from 'lucide-vue-next'
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import EmbeddedDiagram from '@/shared/components/diagram/EmbeddedDiagram.vue'
import { useDiagramSound } from '@/shared/composables/useDiagramSound'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

type DiagramRef = components['schemas']['DiagramRef']

const props = defineProps<{ sound: DiagramRef }>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
const { state, diagram, canPlay, activePositionIds, toggle } = useDiagramSound(() => props.sound)

const busy = computed(() => state.value === 'playing' || state.value === 'loading')
</script>

<template>
  <section v-if="diagram" data-test="what-you-heard" class="flex flex-col gap-2">
    <div class="flex items-center gap-2">
      <h3 data-test="what-you-heard-name" class="text-base font-semibold text-ink">
        {{ t('whatYouHeard.heading', { name: localizedName(diagram.names) }) }}
      </h3>
      <button
        v-if="canPlay"
        data-test="play-again"
        type="button"
        class="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-muted text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        :aria-label="busy ? t('diagramPlayer.stop') : t('whatYouHeard.playAgain')"
        @click="toggle"
      >
        <Square v-if="busy" :size="16" fill="currentColor" aria-hidden="true" />
        <Play v-else :size="20" aria-hidden="true" />
      </button>
    </div>
    <div class="overflow-hidden rounded-[10px] border border-border bg-surface-sunken p-2">
      <EmbeddedDiagram :embed="{ kind: 'single', ref: sound }" :active-position-ids="activePositionIds" />
    </div>
  </section>
</template>
