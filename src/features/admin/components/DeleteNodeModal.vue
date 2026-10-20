<script setup lang="ts">
import { computed, useId } from 'vue'

import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { components } from '@/api/generated/core-domain'

type KnowledgeNode = components['schemas']['KnowledgeNode']
type KnowledgeEdge = components['schemas']['KnowledgeEdge']

const props = withDefaults(
  defineProps<{
    open: boolean
    node: KnowledgeNode
    /** Every node of both kinds. */
    nodes: KnowledgeNode[]
    /** Every edge of both types. */
    edges: KnowledgeEdge[]
    error?: string
    busy?: boolean
  }>(),
  { error: '', busy: false },
)
const emit = defineEmits<{ confirm: []; cancel: [] }>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
const titleId = useId()

const nodesById = computed(() => new Map(props.nodes.map((n) => [n.node_id, n])))
function nameOf(id: string): string {
  const found = nodesById.value.get(id)
  return found ? localizedName(found.names) : ''
}

/** What still depends on the node, as the lines the modal lists. The server also refuses while content uses it. */
const blockers = computed(() => {
  const id = props.node.node_id
  const children = props.nodes
    .filter((n) => n.parent_id === id)
    .map((n) => t('knowledgeMap.delete.child', { name: localizedName(n.names) }))
  const links = props.edges
    .filter((edge) => edge.from_id === id || edge.to_id === id)
    .map((edge) => {
      if (edge.type === 'applies') {
        return edge.from_id === id
          ? t('knowledgeMap.delete.applies', { name: nameOf(edge.to_id) })
          : t('knowledgeMap.delete.appliedBy', { name: nameOf(edge.from_id) })
      }
      return edge.from_id === id
        ? t('knowledgeMap.delete.requires', { name: nameOf(edge.to_id) })
        : t('knowledgeMap.delete.requiredBy', { name: nameOf(edge.from_id) })
    })
  return [...children, ...links]
})
</script>

<template>
  <ModalOverlay
    :open="open"
    panel-class="flex w-[min(480px,calc(100vw-32px))] flex-col gap-4 rounded-xl bg-surface-raised p-5 shadow-level2"
    @close="emit('cancel')"
  >
    <div role="alertdialog" aria-modal="true" :aria-labelledby="titleId" class="flex flex-col gap-4">
      <h2 :id="titleId" class="text-base font-bold text-ink">{{ t('knowledgeMap.delete.title') }}</h2>
      <template v-if="blockers.length > 0">
        <p class="text-sm text-ink-muted">
          {{ t('knowledgeMap.delete.blocked', { name: localizedName(node.names) }) }}
        </p>
        <ul data-test="kmap-delete-blockers" class="flex list-disc flex-col gap-1 pl-5 text-sm text-ink">
          <li v-for="line in blockers" :key="line">{{ line }}</li>
        </ul>
        <div class="flex justify-end">
          <button
            type="button"
            data-test="kmap-delete-close"
            class="rounded-md border border-border bg-surface-raised px-3.5 py-2 text-[0.8125rem] font-semibold text-ink"
            @click="emit('cancel')"
          >
            {{ t('knowledgeMap.delete.close') }}
          </button>
        </div>
      </template>
      <template v-else>
        <p class="text-sm text-ink-muted">{{ t('knowledgeMap.delete.confirmMessage', { name: localizedName(node.names) }) }}</p>
        <p v-if="error" data-test="kmap-delete-error" role="alert" class="text-sm text-danger">{{ error }}</p>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-md border border-border bg-surface-raised px-3.5 py-2 text-[0.8125rem] font-semibold text-ink"
            @click="emit('cancel')"
          >
            {{ t('knowledgeMap.form.cancel') }}
          </button>
          <button
            type="button"
            data-test="kmap-delete-confirm"
            :disabled="busy"
            class="rounded-md bg-danger px-3.5 py-2 text-[0.8125rem] font-semibold text-danger-fg disabled:cursor-not-allowed disabled:opacity-60"
            @click="emit('confirm')"
          >
            {{ t('knowledgeMap.delete.confirm') }}
          </button>
        </div>
      </template>
    </div>
  </ModalOverlay>
</template>
