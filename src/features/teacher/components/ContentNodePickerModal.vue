<script setup lang="ts">
import { computed, ref } from 'vue'

import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import type { components } from '@/api/generated/core-domain'

type ContentNode = components['schemas']['ContentNode']

const props = defineProps<{ open: boolean; contentNodes: ContentNode[]; addedContentNodeIds: string[] }>()
const emit = defineEmits<{ select: [contentNodeId: string]; close: [] }>()

const search = ref('')

const contentTypeLabels: Record<string, string> = {
  video: 'Video',
  article: 'Article',
}

const availableContentNodes = computed(() => {
  const query = search.value.trim().toLowerCase()
  return props.contentNodes.filter((contentNode) => {
    if (props.addedContentNodeIds.includes(contentNode.content_node_id)) return false
    if (!query) return true
    return contentNode.title.toLowerCase().includes(query)
  })
})
</script>

<template>
  <ModalOverlay
    :open="open"
    panel-class="flex max-h-[70vh] w-[420px] flex-col gap-4 rounded-xl bg-surface-raised p-5 shadow-level2"
    @close="emit('close')"
  >
    <div class="flex items-center justify-between">
      <span class="text-base font-bold">Add a content node</span>
      <ModalCloseButton @close="emit('close')" />
    </div>

    <input
      v-model="search"
      data-test="content-node-picker-search"
      type="text"
      placeholder="Search by title"
      class="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm"
    />

    <p
      v-if="availableContentNodes.length === 0"
      data-test="content-node-picker-empty"
      class="text-sm text-ink-subtle"
    >
      No content nodes match — every content node in the library is already in this path, or none matched your search.
    </p>

    <ul v-else class="flex flex-col gap-2 overflow-y-auto">
      <li v-for="contentNode in availableContentNodes" :key="contentNode.content_node_id">
        <button
          type="button"
          data-test="content-node-picker-row"
          class="flex w-full items-center justify-between rounded-md border border-border bg-surface-sunken px-3 py-2.5 text-left"
          @click="emit('select', contentNode.content_node_id)"
        >
          <span class="text-sm font-semibold text-ink">{{ contentNode.title }}</span>
          <span class="text-xs text-ink-subtle">{{ contentTypeLabels[contentNode.content_type] ?? contentNode.content_type }}</span>
        </button>
      </li>
    </ul>
  </ModalOverlay>
</template>
