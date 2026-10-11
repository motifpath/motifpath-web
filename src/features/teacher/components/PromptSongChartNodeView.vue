<script setup lang="ts">
/**
 * An embedded song chart in the rich-text editor: the card students will see. Selected, it offers
 * Replace, which reopens the picker to swap the chart in place, and Remove. Tapping the card here
 * opens nothing, since the author is editing, not reading.
 */
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { computed, provide } from 'vue'

import SongChartCard from '@/shared/components/songChart/SongChartCard.vue'
import { SONG_CHART_OPENER } from '@/shared/components/songChart/songChartOpener'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps(nodeViewProps)

const { t } = useTypedT()
const songChartId = computed(() => (typeof props.node.attrs.songChartId === 'string' ? props.node.attrs.songChartId : null))

provide(SONG_CHART_OPENER, () => {})

function replace() {
  const pos = props.getPos()
  if (typeof pos === 'number') props.extension.options.onReplace(pos)
}
</script>

<template>
  <NodeViewWrapper data-test="prompt-song-chart-node" class="my-2 flex flex-col gap-2" contenteditable="false">
    <div class="rounded-2xl" :class="selected ? 'ring-2 ring-accent' : ''">
      <SongChartCard v-if="songChartId" :song-chart-id="songChartId" />
    </div>
    <div v-if="selected" class="flex w-fit items-center gap-1 rounded-lg bg-surface-sunken px-2 py-1 text-sm">
      <span data-test="prompt-song-chart-chip" class="px-1 text-ink-muted">{{ t('promptEditor.songChart') }}</span>
      <button type="button" data-test="prompt-song-chart-replace" class="rounded-md px-2 py-1 font-semibold text-accent-text hover:bg-surface" @click="replace">
        {{ t('promptEditor.replaceSongChart') }}
      </button>
      <button type="button" data-test="prompt-song-chart-remove" class="rounded-md px-2 py-1 font-semibold text-danger hover:bg-surface" @click="deleteNode()">
        {{ t('promptEditor.removeSongChartShort') }}
      </button>
    </div>
  </NodeViewWrapper>
</template>
