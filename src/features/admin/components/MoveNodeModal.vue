<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { toApiLanguageCode } from '@/i18n'
import KnowledgeTreeBrowser from '@/features/admin/components/KnowledgeTreeBrowser.vue'
import { fitsWithin } from '@/features/admin/utils/knowledgeMap'
import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useScopedLocale } from '@/shared/composables/useScopedLocale'
import { useTypedT } from '@/shared/composables/useTypedT'
import { descendantIds, toTreeNodes } from '@/shared/utils/skillConceptTree'
import type { components } from '@/api/generated/core-domain'

type KnowledgeNode = components['schemas']['KnowledgeNode']

const props = withDefaults(
  defineProps<{
    open: boolean
    node: KnowledgeNode
    /** Every node of the node's kind. */
    nodes: KnowledgeNode[]
    error?: string
    busy?: boolean
  }>(),
  { error: '', busy: false },
)
const emit = defineEmits<{ confirm: [parentId: string | null]; cancel: [] }>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
const locale = useScopedLocale()

/** The chosen parent's id, null for "make it a root", or undefined before a choice. */
const choice = ref<string | null | undefined>(undefined)
watch(
  () => [props.open, props.node.node_id],
  () => {
    choice.value = undefined
  },
)

const treeNodes = computed(() => toTreeNodes(props.nodes, toApiLanguageCode(locale.value)))
const insideIds = computed(() => new Set([props.node.node_id, ...descendantIds(treeNodes.value, props.node.node_id)]))
const nodesById = computed(() => new Map(props.nodes.map((n) => [n.node_id, n])))

function disabledReason(id: string): string | null {
  if (insideIds.value.has(id)) return t('knowledgeMap.move.inside')
  if (id === props.node.parent_id) return t('knowledgeMap.move.currentParent')
  const parent = nodesById.value.get(id)
  if (parent && !fitsWithin(props.node.instrument_ids, parent.instrument_ids)) return t('knowledgeMap.move.narrower')
  return null
}

const summary = computed(() => {
  if (choice.value === undefined) return ''
  const name = localizedName(props.node.names)
  if (choice.value === null) return t('knowledgeMap.move.summaryRoot', { name })
  const parent = nodesById.value.get(choice.value)
  const named = { name, parent: parent ? localizedName(parent.names) : '' }
  const count = insideIds.value.size - 1
  if (count === 0) return t('knowledgeMap.move.summaryAlone', named)
  if (count === 1) return t('knowledgeMap.move.summaryOne', named)
  return t('knowledgeMap.move.summaryMany', { ...named, count })
})
</script>

<template>
  <ModalOverlay
    :open="open"
    panel-class="flex h-[85vh] w-[min(720px,calc(100vw-32px))] flex-col gap-3 rounded-xl bg-surface-raised p-4 shadow-level2 sm:p-5"
    @close="emit('cancel')"
  >
    <div role="dialog" aria-modal="true" :aria-label="t('knowledgeMap.move.title')" class="flex min-h-0 flex-1 flex-col gap-3">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-base font-bold text-ink">
          {{ t('knowledgeMap.move.title') }} — {{ localizedName(node.names) }}
        </h2>
        <ModalCloseButton @close="emit('cancel')" />
      </div>
      <button
        type="button"
        data-test="kmap-move-root"
        :disabled="node.parent_id === null"
        :aria-pressed="choice === null"
        class="w-fit rounded-md border px-3 py-1.5 text-[0.8125rem] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        :class="choice === null ? 'border-accent bg-accent text-accent-fg' : 'border-border bg-surface-raised text-ink'"
        @click="choice = null"
      >
        {{ t('knowledgeMap.move.root') }}
      </button>
      <KnowledgeTreeBrowser
        :label="t('knowledgeMap.move.title')"
        :nodes="treeNodes"
        :selected-id="choice ?? null"
        :disabled-reason="disabledReason"
        @select="choice = $event"
      />
      <p v-if="summary" data-test="kmap-move-summary" class="text-sm text-ink">{{ summary }}</p>
      <p v-if="error" data-test="kmap-move-error" role="alert" class="text-sm text-danger">{{ error }}</p>
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
          data-test="kmap-move-confirm"
          :disabled="choice === undefined || busy"
          class="rounded-md bg-accent px-3.5 py-2 text-[0.8125rem] font-semibold text-accent-fg disabled:cursor-not-allowed disabled:opacity-60"
          @click="choice !== undefined && emit('confirm', choice)"
        >
          {{ t('knowledgeMap.move.confirm') }}
        </button>
      </div>
    </div>
  </ModalOverlay>
</template>
