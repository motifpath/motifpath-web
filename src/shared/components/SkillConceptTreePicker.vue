<script setup lang="ts">
import { ChevronRight, Plus, SlidersHorizontal, X } from 'lucide-vue-next'
import { computed, ref, useId } from 'vue'

import KnowledgeInstrumentFilter from '@/shared/components/KnowledgeInstrumentFilter.vue'
import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import {
  ancestorIds,
  descendantIds,
  selectionSummary,
  suitsInstruments,
  treeRows,
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
     * The instruments of the content being classified. The tree starts on the
     * nodes that fit them; nodes for other instruments can be shown but not
     * picked, and a picked node that doesn't fit is flagged. null fits anything.
     */
    instrumentIds?: string[] | null
    /** Nodes marked as suggested, with a filter to show only them — e.g. the concepts the picked skills apply. */
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
/** 'content' for the nodes that fit the content, '' for any instrument, or one instrument's id. */
const instrumentView = ref(props.instrumentIds === null ? '' : 'content')
const suggestedOnly = ref(false)
const advancedOpen = ref(false)
const areaId = ref('')
const selectedOnly = ref(false)
const expandedIds = ref(new Set<string>())

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
function matchesQuery(node: TreeNode, query: string): boolean {
  return lineage(node).some((n) =>
    [n.name, ...(n.searchTerms ?? [])].some((term) => term.toLowerCase().includes(query)),
  )
}

/** Whether the node may classify the content — always, when there is no content to fit. */
function suits(node: TreeNode): boolean {
  return props.instrumentIds === null || suitsInstruments(node, props.instrumentIds)
}

function allowed(node: TreeNode): boolean {
  return !props.allowedIds || props.allowedIds.includes(node.id)
}

function inInstrumentView(node: TreeNode): boolean {
  if (instrumentView.value === 'content') return suits(node)
  if (instrumentView.value === '') return true
  return suitsInstruments(node, [instrumentView.value])
}

function isSelected(id: string): boolean {
  return props.selectedIds.includes(id)
}

/** A node for none of the content's instruments: shown on request, never newly picked. */
function isDisabled(node: TreeNode): boolean {
  return !suits(node) && !isSelected(node.id)
}

const query = computed(() => search.value.trim().toLowerCase())

const suggestedPickable = computed(() => {
  const ids = new Set(props.suggestedIds)
  return props.nodes.filter((node) => ids.has(node.id) && allowed(node) && suits(node))
})
const suggestedPickableIds = computed(() => new Set(suggestedPickable.value.map((node) => node.id)))

const areas = computed(() =>
  props.nodes
    .filter((node) => allowed(node) && !(node.parent_id && nodesById.value.has(node.parent_id)))
    .sort((a, b) => a.name.localeCompare(b.name)),
)

const rows = computed(() => {
  const narrowing = query.value !== '' || suggestedOnly.value || selectedOnly.value
  return treeRows(props.nodes, {
    include: (node) =>
      allowed(node) && inInstrumentView(node) && (!areaId.value || lineage(node)[0]!.id === areaId.value),
    match: narrowing
      ? (node) =>
          (!query.value || matchesQuery(node, query.value)) &&
          (!suggestedOnly.value || suggestedPickableIds.value.has(node.id)) &&
          (!selectedOnly.value || isSelected(node.id))
      : null,
    expandedIds: expandedIds.value,
  })
})

// Tailwind needs whole class names, so each depth maps to a fixed indent.
const INDENTS = ['pl-1', 'pl-7', 'pl-[3.25rem]', 'pl-[4.75rem]', 'pl-[6.25rem]', 'pl-[7.75rem]']
function indent(depth: number): string {
  return INDENTS[Math.min(depth, INDENTS.length - 1)]!
}

function toggleExpanded(id: string) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

const selectedNodes = computed(() =>
  props.selectedIds.map((id) => nodesById.value.get(id)).filter((n): n is TreeNode => !!n),
)

/** The selection as chips: a fully picked subtree as one entry, the parents picked along with a child left out. */
const summary = computed(() =>
  selectionSummary(props.nodes, props.selectedIds).flatMap(({ id, more }) => {
    const node = nodesById.value.get(id)
    return node ? [{ node, more }] : []
  }),
)

/** Whether the entry's node, or any picked node under it, doesn't fit the content. */
function entryUnsuited(node: TreeNode): boolean {
  return [node.id, ...descendantIds(props.nodes, node.id)].some((id) => {
    const picked = isSelected(id) ? nodesById.value.get(id) : undefined
    return picked !== undefined && !suits(picked)
  })
}

const unsuitedNoteId = useId()
const hasUnsuitedPick = computed(() => selectedNodes.value.some((node) => !suits(node)))

function openPicker() {
  isOpen.value = true
}

function closePicker() {
  isOpen.value = false
}

function toggle(id: string, checked: boolean) {
  if (!props.multiple) {
    emit('update:selectedIds', checked ? [id] : [])
    if (checked) closePicker()
    return
  }
  if (checked) {
    // Checking a node means "this and everything under it" — the descendants
    // that can classify this content — and keeps the ancestor chain intact.
    const node = nodesById.value.get(id)
    const subtree = descendantIds(props.nodes, id).filter((descendantId) => {
      const descendant = nodesById.value.get(descendantId)
      return descendant !== undefined && allowed(descendant) && suits(descendant)
    })
    const ancestors = node ? ancestorIds(props.nodes, node) : []
    emit('update:selectedIds', Array.from(new Set([...props.selectedIds, id, ...subtree, ...ancestors])))
    return
  }
  // Unchecking a node also drops its descendants — a child can never stay
  // selected once its own ancestor chain is broken.
  removeSelected(id)
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

    <div v-if="summary.length > 0" class="flex flex-wrap gap-2">
      <span
        v-for="{ node, more } in summary"
        :key="node.id"
        data-test="tree-selected-chip"
        :data-unsuited="entryUnsuited(node) ? 'true' : undefined"
        :aria-describedby="entryUnsuited(node) ? unsuitedNoteId : undefined"
        class="flex items-center gap-1.5 rounded-full py-[5px] pl-3 pr-1.5 text-[0.8125rem] font-semibold"
        :class="
          entryUnsuited(node)
            ? 'border border-dashed border-danger text-danger'
            : 'bg-accent-muted text-accent-text'
        "
      >
        <span>{{ breadcrumb(node) }}<span v-if="more > 0" data-test="tree-chip-more" class="ml-1 opacity-75" :aria-label="t('skillConceptTreePicker.moreAriaLabel', { count: more })">+{{ more }}</span></span>
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
      panel-class="flex h-[85vh] w-[min(960px,calc(100vw-32px))] flex-col gap-3 rounded-xl bg-surface-raised p-4 shadow-level2 sm:p-5"
      @close="closePicker"
    >
      <div class="flex items-center justify-between">
        <span class="text-base font-bold">{{
          t('skillConceptTreePicker.modalTitle', { label: labelLower })
        }}</span>
        <ModalCloseButton @close="closePicker" />
      </div>

      <div class="flex flex-wrap items-end gap-2">
        <label class="flex min-w-[12rem] flex-1 flex-col gap-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            {{ t('skillConceptTreePicker.searchLabel') }}
          </span>
          <input
            v-model="search"
            data-test="tree-search"
            type="search"
            :placeholder="t('skillConceptTreePicker.search')"
            class="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm"
          />
        </label>
        <KnowledgeInstrumentFilter v-model="instrumentView" :fits-content="instrumentIds !== null" />
        <button
          v-if="suggestedPickable.length > 0"
          type="button"
          data-test="tree-suggested-only"
          :aria-pressed="suggestedOnly"
          class="rounded-full border px-3 py-2 text-sm font-semibold"
          :class="
            suggestedOnly
              ? 'border-accent bg-accent text-accent-fg'
              : 'border-border bg-surface text-ink-muted'
          "
          @click="suggestedOnly = !suggestedOnly"
        >
          {{ t('skillConceptTreePicker.suggestedOnly', { count: suggestedPickable.length }) }}
        </button>
        <button
          type="button"
          data-test="tree-advanced-toggle"
          :aria-expanded="advancedOpen"
          class="flex items-center gap-1.5 rounded-md border border-border bg-surface-raised px-3 py-2 text-sm font-semibold text-ink"
          @click="advancedOpen = !advancedOpen"
        >
          <SlidersHorizontal :size="16" aria-hidden="true" />
          {{ t('skillConceptTreePicker.moreFilters') }}
        </button>
      </div>

      <div
        v-if="advancedOpen"
        class="flex flex-wrap items-end gap-4 rounded-md border border-border bg-surface p-3"
      >
        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            {{ t('skillConceptTreePicker.areaLabel') }}
          </span>
          <select
            v-model="areaId"
            data-test="tree-area-filter"
            class="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm"
          >
            <option value="">{{ t('skillConceptTreePicker.allAreas') }}</option>
            <option v-for="area in areas" :key="area.id" :value="area.id">{{ area.name }}</option>
          </select>
        </label>
        <label class="flex items-center gap-2 pb-2 text-sm">
          <input v-model="selectedOnly" data-test="tree-selected-only" type="checkbox" />
          {{ t('skillConceptTreePicker.selectedOnly') }}
        </label>
      </div>

      <div class="grid min-h-0 flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
        <div
          data-test="tree-pane"
          class="flex min-h-0 flex-col overflow-hidden rounded-md border border-border bg-surface-sunken"
        >
          <p v-if="isLoading" data-test="tree-loading" class="p-2 text-sm text-ink-subtle">
            {{ t('skillConceptTreePicker.loading') }}
          </p>
          <div
            v-else-if="loadFailed"
            data-test="tree-load-failed"
            class="flex flex-col items-start gap-2 p-2 text-sm text-ink-subtle"
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
          <p v-else-if="rows.length === 0" data-test="tree-empty" class="p-2 text-sm text-ink-subtle">
            {{ t('skillConceptTreePicker.empty') }}
          </p>
          <ul v-else role="tree" :aria-label="label" class="flex flex-1 flex-col overflow-y-auto p-1.5">
            <li
              v-for="row in rows"
              :key="row.node.id"
              data-test="tree-node-row"
              role="treeitem"
              :aria-expanded="row.hasChildren ? row.expanded : undefined"
              class="flex items-center gap-1.5 rounded-md py-1 pr-2 text-sm hover:bg-surface-raised"
              :class="indent(row.depth)"
            >
              <button
                v-if="row.hasChildren && !(search || suggestedOnly || selectedOnly)"
                type="button"
                data-test="tree-node-toggle"
                :data-node-id="row.node.id"
                class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-muted"
                :aria-label="
                  row.expanded
                    ? t('skillConceptTreePicker.collapseAriaLabel', { name: row.node.name })
                    : t('skillConceptTreePicker.expandAriaLabel', { name: row.node.name })
                "
                @click="toggleExpanded(row.node.id)"
              >
                <ChevronRight
                  :size="16"
                  aria-hidden="true"
                  class="transition-transform"
                  :class="{ 'rotate-90': row.expanded }"
                />
              </button>
              <span v-else class="w-6 shrink-0" aria-hidden="true" />
              <label
                class="flex min-w-0 flex-1 items-center gap-2"
                :class="isDisabled(row.node) ? 'cursor-not-allowed text-ink-subtle' : 'cursor-pointer'"
              >
                <input
                  v-if="multiple"
                  data-test="tree-node-checkbox"
                  type="checkbox"
                  :value="row.node.id"
                  :checked="isSelected(row.node.id)"
                  :disabled="isDisabled(row.node)"
                  @change="toggle(row.node.id, ($event.target as HTMLInputElement).checked)"
                />
                <input
                  v-else
                  data-test="tree-node-radio"
                  type="radio"
                  :name="`${label}-tree-radio`"
                  :value="row.node.id"
                  :checked="isSelected(row.node.id)"
                  :disabled="isDisabled(row.node)"
                  @change="toggle(row.node.id, ($event.target as HTMLInputElement).checked)"
                />
                <span
                  data-test="tree-node-name"
                  class="truncate"
                  :class="{ 'font-semibold': row.matched && (search || suggestedOnly || selectedOnly) }"
                  >{{ row.node.name }}</span
                >
                <span
                  v-if="suggestedPickableIds.has(row.node.id)"
                  data-test="tree-suggested-badge"
                  class="shrink-0 rounded-full bg-accent-muted px-2 py-0.5 text-xs font-semibold text-accent-text"
                >
                  {{ t('skillConceptTreePicker.suggestedBadge') }}
                </span>
                <span
                  v-if="!suits(row.node)"
                  data-test="tree-node-unsuited"
                  class="shrink-0 text-xs text-danger"
                >
                  {{ t('skillConceptTreePicker.unsuitedRow') }}
                </span>
              </label>
            </li>
          </ul>
        </div>

        <section
          data-test="tree-selection"
          class="flex max-h-40 min-h-0 flex-col gap-2 rounded-md border border-border p-3 sm:max-h-none"
        >
          <h3 class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            {{ t('skillConceptTreePicker.selectionHeading', { count: selectedNodes.length }) }}
          </h3>
          <p v-if="summary.length === 0" class="text-sm text-ink-subtle">
            {{ t('skillConceptTreePicker.nothingSelected') }}
          </p>
          <ul v-else class="flex flex-col gap-1.5 overflow-y-auto">
            <li
              v-for="{ node, more } in summary"
              :key="node.id"
              data-test="tree-selection-item"
              class="flex items-start justify-between gap-2 text-sm"
              :class="{ 'text-danger': entryUnsuited(node) }"
            >
              <span class="min-w-0 break-words">{{ breadcrumb(node) }}<span v-if="more > 0" class="ml-1 text-ink-subtle" :aria-label="t('skillConceptTreePicker.moreAriaLabel', { count: more })">+{{ more }}</span></span>
              <button
                type="button"
                data-test="tree-selection-remove"
                class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-ink-muted"
                :aria-label="t('skillConceptTreePicker.removeSelectedAriaLabel', { name: node.name })"
                @click="removeSelected(node.id)"
              >
                <X :size="12" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </section>
      </div>

      <div class="flex items-center justify-between gap-3">
        <p v-if="missingHint && !loadFailed" data-test="tree-missing-hint" class="text-xs text-ink-subtle">
          {{ t('skillConceptTreePicker.missingHint') }}
        </p>
        <button
          type="button"
          data-test="tree-close"
          class="ml-auto w-fit rounded-md border border-border bg-surface-raised px-3.5 py-2 text-[0.8125rem] font-semibold"
          @click="closePicker"
        >
          {{ t('skillConceptTreePicker.closeButton') }}
        </button>
      </div>
    </ModalOverlay>
  </div>
</template>
