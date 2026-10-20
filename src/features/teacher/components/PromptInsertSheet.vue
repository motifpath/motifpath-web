<script setup lang="ts">
import { Guitar, Image as ImageIcon, Link as LinkIcon, Music, Table2 } from 'lucide-vue-next'

import MenuRow from '@/shared/components/MenuRow.vue'
import OverlayPanel from '@/shared/components/OverlayPanel.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

/** What can go into rich text, on a phone: a link, a table, an image, a diagram, a song chart. */
defineProps<{
  open: boolean
  /** Whether a song chart is offered: only lesson content has one, never an exercise. */
  songCharts: boolean
}>()
const emit = defineEmits<{ close: []; link: []; table: []; image: []; diagram: []; songChart: [] }>()

const { t } = useTypedT()
</script>

<template>
  <OverlayPanel :open="open" :title="t('promptEditor.insert')" @close="emit('close')">
    <div data-test="prompt-insert-sheet" class="-mx-5 flex flex-col">
      <MenuRow data-test="prompt-insert-link" :icon="LinkIcon" :label="t('promptEditor.link')" chevron @click="emit('link')" />
      <MenuRow
        data-test="prompt-insert-table"
        :icon="Table2"
        :label="t('promptEditor.table')"
        :value="t('promptEditor.insertTableHint')"
        chevron
        @click="emit('table')"
      />
      <MenuRow
        data-test="prompt-insert-image"
        :icon="ImageIcon"
        :label="t('promptEditor.image')"
        :value="t('promptEditor.insertImageHint')"
        chevron
        @click="emit('image')"
      />
      <MenuRow
        data-test="prompt-insert-diagram"
        :icon="Guitar"
        :label="t('promptEditor.diagram')"
        :value="t('promptEditor.insertDiagramHint')"
        chevron
        @click="emit('diagram')"
      />
      <MenuRow
        v-if="songCharts"
        data-test="prompt-insert-song-chart"
        :icon="Music"
        :label="t('promptEditor.songChart')"
        chevron
        @click="emit('songChart')"
      />
    </div>
  </OverlayPanel>
</template>
