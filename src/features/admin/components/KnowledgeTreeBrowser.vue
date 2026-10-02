<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

import KnowledgeInstrumentFilter from '@/shared/components/KnowledgeInstrumentFilter.vue'
import { useInstrumentNames } from '@/shared/composables/useInstrumentNames'
import { useTypedT } from '@/shared/composables/useTypedT'
import { ancestorIds, suitsInstruments, treeRows, type TreeNode } from '@/shared/utils/skillConceptTree'

const props = withDefaults(
  defineProps<{
    label: string
    nodes: TreeNode[]
    selectedId: string | null
    /** Why a node can't be chosen here, or null when it can. */
    disabledReason?: (id: string) => string | null
  }>(),
  { disabledReason: () => null },
)
const emit = defineEmits<{ select: [id: string] }>()

const { t } = useTypedT()
const { instrumentsLabel } = useInstrumentNames()

const search = ref('')
/** '' for any instrument, or one instrument's id. */
const instrumentView = ref('')
const expandedIds = ref(new Set<string>())

const nodesById = computed(() => new Map(props.nodes.map((node) => [node.id, node])))

// The selected node is always in view: its ancestors open whenever it changes
// or arrives after the nodes load.
watch(
  () => [props.selectedId, props.nodes] as const,
  ([selectedId]) => {
    const node = selectedId ? nodesById.value.get(selectedId) : undefined
    if (!node) return
    expandedIds.value = new Set([...expandedIds.value, ...ancestorIds(props.nodes, node)])
  },
  { immediate: true },
)

/** A node matches when it or any ancestor has a name (in any language) or key containing the query. */
function matchesQuery(node: TreeNode, query: string): boolean {
  const lineage = [node, ...ancestorIds(props.nodes, node).map((id) => nodesById.value.get(id)!)]
  return lineage.some((n) => [n.name, ...(n.searchTerms ?? [])].some((term) => term.toLowerCase().includes(query)))
}

const query = computed(() => search.value.trim().toLowerCase())

const rows = computed(() =>
  treeRows(props.nodes, {
    include: () => true,
    match: query.value ? (node) => matchesQuery(node, query.value) : null,
    expandedIds: expandedIds.value,
  }),
)

function greyed(node: TreeNode): boolean {
  return instrumentView.value !== '' && !suitsInstruments(node, [instrumentView.value])
}

function toggleExpanded(id: string) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

// Tailwind needs whole class names, so each depth maps to a fixed indent.
const INDENTS = ['pl-1', 'pl-7', 'pl-[3.25rem]', 'pl-[4.75rem]', 'pl-[6.25rem]', 'pl-[7.75rem]']
function indent(depth: number): string {
  return INDENTS[Math.min(depth, INDENTS.length - 1)]!
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-2">
    <div class="flex flex-wrap items-end gap-2">
      <label class="flex min-w-[10rem] flex-1 flex-col gap-1">
        <span class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          {{ t('skillConceptTreePicker.searchLabel') }}
        </span>
        <input
          v-model="search"
          data-test="kmap-tree-search"
          type="search"
          :placeholder="t('skillConceptTreePicker.search')"
          class="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm"
        />
      </label>
      <KnowledgeInstrumentFilter v-model="instrumentView" :fits-content="false" />
    </div>

    <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-surface-sunken">
      <p v-if="rows.length === 0" data-test="kmap-tree-empty" class="p-2 text-sm text-ink-subtle">
        {{ t('skillConceptTreePicker.empty') }}
      </p>
      <ul v-else role="tree" :aria-label="label" class="flex flex-1 flex-col overflow-y-auto p-1.5">
        <li
          v-for="row in rows"
          :key="row.node.id"
          data-test="kmap-tree-row"
          role="treeitem"
          :aria-selected="row.node.id === selectedId ? 'true' : 'false'"
          :aria-expanded="row.hasChildren ? row.expanded : undefined"
          class="flex items-center gap-1 rounded-md pr-1 text-sm"
          :class="[indent(row.depth), row.node.id === selectedId ? 'bg-accent-muted' : 'hover:bg-surface-raised']"
        >
          <button
            v-if="row.hasChildren && !query"
            type="button"
            data-test="kmap-tree-toggle"
            :data-node-id="row.node.id"
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-muted"
            :aria-label="
              row.expanded
                ? t('skillConceptTreePicker.collapseAriaLabel', { name: row.node.name })
                : t('skillConceptTreePicker.expandAriaLabel', { name: row.node.name })
            "
            @click="toggleExpanded(row.node.id)"
          >
            <ChevronRight :size="16" aria-hidden="true" class="transition-transform" :class="{ 'rotate-90': row.expanded }" />
          </button>
          <span v-else class="w-6 shrink-0" aria-hidden="true" />
          <button
            type="button"
            data-test="kmap-tree-select"
            :data-node-id="row.node.id"
            :data-greyed="greyed(row.node) ? 'true' : undefined"
            :disabled="disabledReason(row.node.id) !== null"
            class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 py-1 text-left disabled:cursor-not-allowed"
            :class="
              disabledReason(row.node.id) !== null || greyed(row.node)
                ? 'text-ink-subtle'
                : row.node.id === selectedId
                  ? 'font-semibold text-accent-text'
                  : 'text-ink'
            "
            @click="emit('select', row.node.id)"
          >
            <span data-test="kmap-tree-name" class="truncate" :class="{ 'font-semibold': query && row.matched }">{{
              row.node.name
            }}</span>
            <span
              v-if="(row.node.instrumentIds ?? []).length > 0"
              data-test="kmap-tree-badge"
              class="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs text-ink-muted"
              >{{ instrumentsLabel(row.node.instrumentIds ?? []) }}</span
            >
            <span v-if="disabledReason(row.node.id)" data-test="kmap-tree-reason" class="w-full text-xs">{{
              disabledReason(row.node.id)
            }}</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
