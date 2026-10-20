<script setup lang="ts">
/**
 * How an inline diagram looks inside the rich-text editor: drawn as the
 * student will see it, with edit and remove buttons. One that can't be shown
 * keeps a placeholder, so the author can still find and fix it.
 */
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { Pencil, Trash2 } from 'lucide-vue-next'
import { computed } from 'vue'

import EmbeddedDiagram from '@/shared/components/diagram/EmbeddedDiagram.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { parseDiagramEmbed } from '@/shared/utils/diagramEmbed'

const props = defineProps(nodeViewProps)

const { t } = useTypedT()

const embed = computed(() => parseDiagramEmbed(props.node.attrs.diagramRef, props.node.attrs.diagramStackRef))

function edit() {
  const pos = props.getPos()
  if (typeof pos === 'number') props.extension.options.onEdit(pos)
}
</script>

<template>
  <NodeViewWrapper
    data-test="prompt-diagram-node"
    class="my-1 flex flex-col gap-1 rounded-md border p-2"
    :class="selected ? 'border-accent' : 'border-border'"
    contenteditable="false"
  >
    <div class="flex justify-end gap-1">
      <button
        type="button"
        data-test="prompt-diagram-edit"
        class="rounded p-1 text-ink-muted"
        :title="t('promptEditor.editDiagram')"
        :aria-label="t('promptEditor.editDiagram')"
        @click="edit"
      >
        <Pencil :size="14" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-diagram-remove"
        class="rounded p-1 text-danger"
        :title="t('promptEditor.removeDiagram')"
        :aria-label="t('promptEditor.removeDiagram')"
        @click="deleteNode()"
      >
        <Trash2 :size="14" aria-hidden="true" />
      </button>
    </div>
    <EmbeddedDiagram v-if="embed" :embed="embed">
      <template #unavailable>
        <p data-test="prompt-diagram-unavailable" class="text-sm text-ink-muted">
          {{ t('promptEditor.diagramUnavailable') }}
        </p>
      </template>
    </EmbeddedDiagram>
    <p v-else data-test="prompt-diagram-unavailable" class="text-sm text-ink-muted">
      {{ t('promptEditor.diagramUnavailable') }}
    </p>
  </NodeViewWrapper>
</template>
