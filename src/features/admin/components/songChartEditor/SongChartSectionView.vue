<script setup lang="ts">
/**
 * A section as the lyrics editor draws it: its heading, which isn't part of the text, above its
 * lines and comments.
 */
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { computed, inject } from 'vue'

import type { components } from '@/api/generated/core-domain'
import SongChartSectionHeading from '@/features/admin/components/songChartEditor/SongChartSectionHeading.vue'
import { sectionHeadingContextKey } from '@/features/admin/components/songChartEditor/sectionHeadingContext'
import { SECTION_KINDS } from '@/features/admin/components/songChartEditor/extensions'

type SectionAttrs = components['schemas']['SongChartSection']['attrs']

const props = defineProps(nodeViewProps)
const context = inject(sectionHeadingContextKey, null)

const attrs = computed((): SectionAttrs => {
  const { kind, label, progression_keys } = props.node.attrs
  return {
    kind: SECTION_KINDS.find((k) => k === kind) ?? 'other',
    label: typeof label === 'string' ? label : null,
    progression_keys: Array.isArray(progression_keys) ? progression_keys.filter((k): k is string => typeof k === 'string') : [],
  }
})

/** The section's place in the chart, counted from 0, read afresh as sections come and go. */
function sectionIndex(): number {
  const pos = props.getPos()
  let index = -1
  props.editor.state.doc.forEach((_, offset, i) => {
    if (offset === pos) index = i
  })
  return index
}
</script>

<template>
  <NodeViewWrapper as="section" :data-kind="attrs.kind" :data-label="attrs.label ?? undefined">
    <div v-if="context" contenteditable="false" class="mb-1 select-none">
      <SongChartSectionHeading
        data-test="section-heading"
        :section="attrs"
        :unplayed="context.unplayedAt(sectionIndex())"
        :concert-key="context.concertKey()"
        @remove="context.remove(sectionIndex(), $event)"
        @add="context.openPicker(sectionIndex(), $event)"
      />
    </div>
    <NodeViewContent />
  </NodeViewWrapper>
</template>
