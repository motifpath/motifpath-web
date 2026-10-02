<script setup lang="ts">
import { Plus, X } from 'lucide-vue-next'
import { computed, ref, useId } from 'vue'

import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import {
  ancestorIds,
  descendantIds,
  suitsInstruments,
  type TreeNode,
} from '@/shared/utils/skillConceptTree'

export type { TreeNode }

const props = withDefaults(
  defineProps<{
    label: string
    nodes: TreeNode[]
    selectedIds: string[]
    /** false renders radios and keeps selectedIds to at most one entry — used for a Challenge's single subject. */
    multiple?: boolean
    isLoading?: boolean
    /** The nodes failed to load: the picker says so and offers a retry. */
    loadFailed?: boolean
    /** Restricts which nodes can be browsed/picked, e.g. to a content node's own linked classification. */
    allowedIds?: string[] | null
    /**
     * The instruments of the content being classified: only nodes that suit them
     * are listed, and a picked node that doesn't is flagged. null lists every node.
     */
    instrumentIds?: string[] | null
    /** Nodes listed first under "Suggested" — e.g. the concepts the picked skills apply. */
    suggestedIds?: string[]
    /** Shows a hint that missing nodes are added by the team, for authoring pickers. */
    missingHint?: boolean
  }>(),
  {
    multiple: true,
    isLoading: false,
    loadFailed: false,
    allowedIds: null,
    instrumentIds: null,
    suggestedIds: () => [],
    missingHint: false,
  },
)
const emit = defineEmits<{
  'update:selectedIds': [ids: string[]]
  retry: []
}>()

const { t } = useTypedT()

const labelLower = computed(() => props.label.toLowerCase())

const isOpen = ref(false)
const search = ref('')

const nodesById = computed(() => new Map(props.nodes.map((n) => [n.id, n])))

/** The node and its ancestors, root first. */
function lineage(node: TreeNode): TreeNode[] {
  const path = [node]
  let current = node
  while (current.parent_id) {
    const parent = nodesById.value.get(current.parent_id)
    if (!parent) break
    path.unshift(parent)
    current = parent
  }
  return path
}

function breadcrumb(node: TreeNode): string {
  return lineage(node)
    .map((n) => n.name)
    .join(' > ')
}

/** A node matches when it or any ancestor has a name (in any language) or key containing the query. */
function matches(node: TreeNode, query: string): boolean {
  return lineage(node).some((n) =>
    [n.name, ...(n.searchTerms ?? [])].some((term) => term.toLowerCase().includes(query)),
  )
}

function suits(node: TreeNode): boolean {
  return props.instrumentIds === null || suitsInstruments(node, props.instrumentIds)
}

function pickable(node: TreeNode): boolean {
  return (!props.allowedIds || props.allowedIds.includes(node.id)) && suits(node)
}

function openPicker() {
  isOpen.value = true
}

function closePicker() {
  isOpen.value = false
}

const query = computed(() => search.value.trim().toLowerCase())

const visibleNodes = computed(() =>
  props.nodes
    .filter(pickable)
    .filter((node) => !query.value || matches(node, query.value))
    .sort((a, b) => breadcrumb(a).localeCompare(breadcrumb(b))),
)

const suggestedNodes = computed(() =>
  query.value
    ? []
    : props.suggestedIds
        .map((id) => nodesById.value.get(id))
        .filter((n): n is TreeNode => !!n && pickable(n))
        .sort((a, b) => breadcrumb(a).localeCompare(breadcrumb(b))),
)

const selectedNodes = computed(() =>
  props.selectedIds.map((id) => nodesById.value.get(id)).filter((n): n is TreeNode => !!n),
)

const unsuitedNoteId = useId()
const hasUnsuitedPick = computed(() => selectedNodes.value.some((node) => !suits(node)))

function isSelected(id: string): boolean {
  return props.selectedIds.includes(id)
}

function toggle(id: string, checked: boolean) {
  if (!props.multiple) {
    emit('update:selectedIds', checked ? [id] : [])
    if (checked) closePicker()
    return
  }
  if (checked) {
    const node = nodesById.value.get(id)
    const withAncestors = node ? [id, ...ancestorIds(props.nodes, node)] : [id]
    emit('update:selectedIds', Array.from(new Set([...props.selectedIds, ...withAncestors])))
    return
  }
  // Unchecking a node also drops its descendants — a child can never stay
  // selected once its own ancestor chain is broken.
  const toRemove = new Set([id, ...descendantIds(props.nodes, id)])
  emit(
    'update:selectedIds',
    props.selectedIds.filter((i) => !toRemove.has(i)),
  )
}

function removeSelected(id: string) {
  const toRemove = new Set([id, ...descendantIds(props.nodes, id)])
  emit(
    'update:selectedIds',
    props.selectedIds.filter((i) => !toRemove.has(i)),
  )
}
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <label class="text-sm font-semibold">{{ label }}</label>

    <div v-if="selectedNodes.length > 0" class="flex flex-wrap gap-2">
      <span
        v-for="node in selectedNodes"
        :key="node.id"
        data-test="tree-selected-chip"
        :data-unsuited="suits(node) ? undefined : 'true'"
        :aria-describedby="suits(node) ? undefined : unsuitedNoteId"
        class="flex items-center gap-1.5 rounded-full py-[5px] pl-3 pr-1.5 text-[0.8125rem] font-semibold"
        :class="
          suits(node)
            ? 'bg-accent-muted text-accent-text'
            : 'border border-dashed border-danger text-danger'
        "
      >
        {{ breadcrumb(node) }}
        <button
          v-if="multiple"
          type="button"
          data-test="tree-selected-chip-remove"
          class="flex h-[18px] w-[18px] items-center justify-center rounded-full"
          :aria-label="t('skillConceptTreePicker.removeSelectedAriaLabel', { name: node.name })"
          @click="removeSelected(node.id)"
        >
          <X :size="11" :stroke-width="2.4" aria-hidden="true" />
        </button>
      </span>
    </div>
    <p
      v-if="hasUnsuitedPick"
      :id="unsuitedNoteId"
      data-test="tree-unsuited-note"
      class="text-[0.8125rem] text-danger"
    >
      {{ t('skillConceptTreePicker.unsuitedNote') }}
    </p>

    <button
      type="button"
      data-test="tree-open-picker"
      class="flex w-fit items-center gap-1.5 rounded-md border border-border bg-surface-raised px-3 py-1.5 text-[0.8125rem] font-semibold"
      @click="openPicker"
    >
      <Plus :size="14" aria-hidden="true" />
      {{
        selectedNodes.length > 0
          ? t('skillConceptTreePicker.changeButton', { label: labelLower })
          : t('skillConceptTreePicker.addButton', { label: labelLower })
      }}
    </button>

    <ModalOverlay
      :open="isOpen"
      panel-class="flex max-h-[80vh] w-[420px] flex-col gap-3 rounded-xl bg-surface-raised p-5 shadow-level2"
      @close="closePicker"
    >
      <div class="contents">
        <div class="flex items-center justify-between">
          <span class="text-base font-bold">{{
            t('skillConceptTreePicker.modalTitle', { label: labelLower })
          }}</span>
          <ModalCloseButton @close="closePicker" />
        </div>

        <input
          v-model="search"
          data-test="tree-search"
          type="text"
          :placeholder="t('skillConceptTreePicker.search')"
          class="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm"
        />

        <div
          class="flex h-48 flex-col overflow-hidden rounded-md border border-border bg-surface-sunken"
        >
          <p v-if="isLoading" data-test="tree-loading" class="p-1.5 text-sm text-ink-subtle">
            {{ t('skillConceptTreePicker.loading') }}
          </p>
          <div
            v-else-if="loadFailed"
            data-test="tree-load-failed"
            class="flex flex-col items-start gap-2 p-1.5 text-sm text-ink-subtle"
          >
            {{ t('skillConceptTreePicker.loadFailed') }}
            <button
              type="button"
              data-test="tree-retry"
              class="rounded-md border border-border bg-surface-raised px-3 py-1.5 text-[0.8125rem] font-semibold text-ink"
              @click="emit('retry')"
            >
              {{ t('skillConceptTreePicker.retry') }}
            </button>
          </div>
          <p
            v-else-if="visibleNodes.length === 0"
            data-test="tree-empty"
            class="p-1.5 text-sm text-ink-subtle"
          >
            {{ t('skillConceptTreePicker.empty') }}
          </p>
          <div v-else class="flex flex-1 flex-col gap-1 overflow-y-auto p-1.5">
            <template v-if="suggestedNodes.length > 0">
              <span
                data-test="tree-suggested-heading"
                class="px-2 pt-1 text-xs font-semibold text-ink-subtle"
              >
                {{ t('skillConceptTreePicker.suggested') }}
              </span>
              <ul class="flex flex-col gap-1 border-b border-border pb-1.5">
                <li
                  v-for="node in suggestedNodes"
                  :key="node.id"
                  data-test="tree-suggested-row"
                  class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-raised"
                >
                  <label class="flex flex-1 cursor-pointer items-center gap-2">
                    <input
                      :type="multiple ? 'checkbox' : 'radio'"
                      :name="multiple ? undefined : `${label}-tree-radio`"
                      :value="node.id"
                      :checked="isSelected(node.id)"
                      @change="toggle(node.id, ($event.target as HTMLInputElement).checked)"
                    />
                    {{ breadcrumb(node) }}
                  </label>
                </li>
              </ul>
            </template>
            <ul class="flex flex-col gap-1">
              <li
                v-for="node in visibleNodes"
                :key="node.id"
                data-test="tree-node-row"
                class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-raised"
              >
                <label class="flex flex-1 cursor-pointer items-center gap-2">
                  <input
                    v-if="multiple"
                    data-test="tree-node-checkbox"
                    type="checkbox"
                    :value="node.id"
                    :checked="isSelected(node.id)"
                    @change="toggle(node.id, ($event.target as HTMLInputElement).checked)"
                  />
                  <input
                    v-else
                    data-test="tree-node-radio"
                    type="radio"
                    :name="`${label}-tree-radio`"
                    :value="node.id"
                    :checked="isSelected(node.id)"
                    @change="toggle(node.id, ($event.target as HTMLInputElement).checked)"
                  />
                  {{ breadcrumb(node) }}
                </label>
              </li>
            </ul>
          </div>
        </div>

        <p v-if="missingHint && !loadFailed" data-test="tree-missing-hint" class="text-xs text-ink-subtle">
          {{ t('skillConceptTreePicker.missingHint') }}
        </p>

        <button
          type="button"
          data-test="tree-close"
          class="w-fit self-end rounded-md border border-border bg-surface-raised px-3.5 py-2 text-[0.8125rem] font-semibold"
          @click="closePicker"
        >
          {{ t('skillConceptTreePicker.closeButton') }}
        </button>
      </div>
    </ModalOverlay>
  </div>
</template>
