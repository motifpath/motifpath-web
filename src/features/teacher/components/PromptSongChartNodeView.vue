<script setup lang="ts">
/**
 * An embedded song chart in the rich-text editor: the card students will see, and a control to
 * remove it. Tapping the card here opens nothing, since the author is editing, not reading.
 */
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { Music, Trash2 } from 'lucide-vue-next'
import { computed, provide } from 'vue'

import SongChartCard from '@/shared/components/songChart/SongChartCard.vue'
import { SONG_CHART_OPENER } from '@/shared/components/songChart/songChartOpener'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps(nodeViewProps)

const { t } = useTypedT()
const songChartId = computed(() => (typeof props.node.attrs.songChartId === 'string' ? props.node.attrs.songChartId : null))

provide(SONG_CHART_OPENER, () => {})
</script>

<template>
  <NodeViewWrapper
    data-test="prompt-song-chart-node"
    class="my-1 flex flex-col gap-1 rounded-md border p-2"
    :class="selected ? 'border-accent' : 'border-border'"
    contenteditable="false"
  >
    <div class="flex items-center justify-between gap-1">
      <span class="flex items-center gap-1 text-xs font-semibold text-ink-muted">
        <Music :size="12" aria-hidden="true" />{{ t('promptEditor.songChart') }}
      </span>
      <button
        type="button"
        data-test="prompt-song-chart-remove"
        class="rounded p-1 text-danger"
        :title="t('promptEditor.removeSongChart')"
        :aria-label="t('promptEditor.removeSongChart')"
        @click="deleteNode()"
      >
        <Trash2 :size="14" aria-hidden="true" />
      </button>
    </div>
    <SongChartCard v-if="songChartId" :song-chart-id="songChartId" />
  </NodeViewWrapper>
</template>
