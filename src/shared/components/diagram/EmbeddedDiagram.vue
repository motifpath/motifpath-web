<script setup lang="ts">
/**
 * A prebuilt diagram embedded in what a student studies — a video cue or an
 * inline `diagram` node. It loads the diagram itself, holds its space while
 * loading, and shows nothing at all (its caption included) when the diagram
 * can't be shown, since a student can do nothing about it.
 *
 * `root_override` and `playback` aren't applied yet: the diagram is drawn as
 * authored.
 */
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import { useEmbeddedDiagram } from '@/shared/composables/useEmbeddedDiagram'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { DiagramEmbed } from '@/shared/utils/diagramEmbed'

const props = defineProps<{ embed: DiagramEmbed; caption?: string }>()

const { t } = useTypedT()
const { status, diagram, instrument, diagramRef, labelMode } = useEmbeddedDiagram(() => props.embed)
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
    <FrettedDiagramView
      :diagram="diagram"
      :instrument="instrument"
      :diagram-ref="diagramRef"
      :label-mode="labelMode"
    />
    <figcaption v-if="props.caption" class="text-sm text-ink-muted">{{ props.caption }}</figcaption>
  </figure>
</template>
