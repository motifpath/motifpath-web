<script setup lang="ts">
/**
 * Chooses several skills (or concepts) to filter a list by. A tap on a row chooses it (✓) or
 * unchooses it; choosing an area matches it and everything under it, which the picker says.
 * The chosen ones show as removable chips at the top.
 *
 * It starts on the areas; "N skills ›" opens one, with a path back up. Recent choices come
 * first, Done goes back to the filters, and the tree keeps to the filtered instrument, with All
 * instruments to widen.
 */
import { Check, ChevronRight } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import ChoiceChip from '@/shared/components/ChoiceChip.vue'
import FilterChip from '@/shared/components/FilterChip.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import SearchField from '@/shared/components/SearchField.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { ancestorIds, suitsInstruments, type TreeNode } from '@/shared/utils/skillConceptTree'

const props = defineProps<{
  kind: 'skill' | 'concept'
  nodes: TreeNode[]
  /** The filtered instrument; null for every instrument. */
  instrumentId: string | null
  instrumentName: string | null
}>()
const chosen = defineModel<string[]>({ required: true })
const emit = defineEmits<{ done: [] }>()

const { t } = useTypedT()

const RECENT_LIMIT = 5
const recentKey = computed(() => `motifpath.teach-recent-${props.kind}.v1`)

const search = ref('')
const allInstruments = ref(false)
/** The area opened while drilling in; null at the top. */
const openedId = ref<string | null>(null)
const recentIds = ref<string[]>(readRecent())

const byId = computed(() => new Map(props.nodes.map((node) => [node.id, node])))
const query = computed(() => search.value.trim().toLowerCase())

function inScope(node: TreeNode): boolean {
  return !props.instrumentId || allInstruments.value || suitsInstruments(node, [props.instrumentId])
}

function matches(node: TreeNode): boolean {
  return [node.name, ...(node.searchTerms ?? [])].some((term) => term.toLowerCase().includes(query.value))
}

function childrenOf(id: string | null): TreeNode[] {
  return props.nodes
    .filter((node) => node.parent_id === id && inScope(node))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** What an area's open button shows: how many it opens onto ("3 skills"). */
function openLabel(count: number): string {
  return t(`knowledgeFilter.${props.kind}.open`, { count })
}

function childCount(id: string): number {
  return childrenOf(id).length
}

/** The node's ancestors' names, top first: where a search result sits. */
function pathOf(node: TreeNode): string {
  return ancestorIds(props.nodes, node)
    .reverse()
    .map((id) => byId.value.get(id)?.name ?? '')
    .join(' › ')
}

interface Row {
  node: TreeNode
  meta: string
  opens: number
}

const rows = computed<Row[]>(() => {
  if (query.value) {
    return props.nodes
      .filter((node) => inScope(node) && matches(node))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((node) => ({ node, meta: pathOf(node), opens: 0 }))
  }
  return childrenOf(openedId.value).map((node) => ({ node, meta: '', opens: childCount(node.id) }))
})

/** The opened area and the areas above it, top first. */
const trail = computed(() => {
  const opened = openedId.value ? byId.value.get(openedId.value) : undefined
  if (!opened) return []
  return [...ancestorIds(props.nodes, opened).reverse(), opened.id]
    .map((id) => byId.value.get(id))
    .filter((node): node is TreeNode => !!node)
})

const recentNodes = computed(() =>
  !query.value && openedId.value === null
    ? recentIds.value.map((id) => byId.value.get(id)).filter((node): node is TreeNode => !!node && inScope(node))
    : [],
)

const chosenNodes = computed(() =>
  chosen.value.map((id) => byId.value.get(id)).filter((node): node is TreeNode => !!node),
)

function isChosen(id: string): boolean {
  return chosen.value.includes(id)
}

function toggle(id: string) {
  if (isChosen(id)) {
    chosen.value = chosen.value.filter((other) => other !== id)
    return
  }
  chosen.value = [...chosen.value, id]
  rememberRecent(id)
}

function open(row: Row) {
  openedId.value = row.node.id
}

function readRecent(): string[] {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(recentKey.value) ?? '[]')
    return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function rememberRecent(id: string) {
  recentIds.value = [id, ...recentIds.value.filter((other) => other !== id)].slice(0, RECENT_LIMIT)
  try {
    window.localStorage.setItem(recentKey.value, JSON.stringify(recentIds.value))
  } catch {
    // Recent choices are a convenience; the picker works the same without them.
  }
}

</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3">
    <SearchField v-model="search" :placeholder="t(`knowledgeFilter.${kind}.search`)" />

    <div
      v-if="chosenNodes.length"
      class="flex flex-wrap gap-2"
      role="group"
      :aria-label="t(`knowledgeFilter.${kind}.chosen`)"
    >
      <FilterChip v-for="node in chosenNodes" :key="node.id" :label="node.name" @remove="toggle(node.id)" />
    </div>

    <div
      v-if="instrumentId && instrumentName"
      class="flex flex-wrap gap-x-2"
      role="group"
      :aria-label="t('knowledgeFilter.instrumentScope')"
    >
      <ChoiceChip :label="instrumentName" :selected="!allInstruments" @toggle="allInstruments = false" />
      <ChoiceChip
        data-test="knowledge-all-instruments"
        :label="t('knowledgeFilter.allInstruments')"
        :selected="allInstruments"
        @toggle="allInstruments = true"
      />
    </div>

    <section v-if="recentNodes.length" data-test="knowledge-recent" class="flex flex-col">
      <h3 class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{{ t('knowledgeFilter.recent') }}</h3>
      <button
        v-for="node in recentNodes"
        :key="node.id"
        type="button"
        :aria-pressed="isChosen(node.id) ? 'true' : 'false'"
        class="flex min-h-12 items-center gap-3 text-left text-base text-ink hover:bg-surface-sunken"
        @click="toggle(node.id)"
      >
        <Check :size="20" :class="isChosen(node.id) ? 'text-accent-text' : 'invisible'" aria-hidden="true" />
        <span class="min-w-0 flex-1 truncate">{{ node.name }}</span>
        <span class="text-xs text-ink-muted">{{ pathOf(node) }}</span>
      </button>
    </section>

    <nav v-if="trail.length && !query" data-test="knowledge-path" class="flex flex-wrap items-center text-sm font-semibold text-accent-text">
      <button type="button" data-test="knowledge-path-root" class="min-h-10 hover:underline" @click="openedId = null">{{ t(`knowledgeFilter.${kind}.title`) }}</button>
      <template v-for="(node, index) in trail" :key="node.id">
        <span aria-hidden="true">{{ ' › ' }}</span>
        <span v-if="index === trail.length - 1" aria-current="location">{{ node.name }}</span>
        <button v-else type="button" class="min-h-10 hover:underline" @click="openedId = node.id">{{ node.name }}</button>
      </template>
    </nav>

    <ul class="flex flex-col">
      <li v-for="row in rows" :key="row.node.id" data-test="knowledge-row" class="flex items-center">
        <button
          type="button"
          data-test="knowledge-row-choose"
          :aria-pressed="isChosen(row.node.id) ? 'true' : 'false'"
          class="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-left hover:bg-surface-sunken focus-visible:bg-surface-sunken focus-visible:outline-none"
          @click="toggle(row.node.id)"
        >
          <Check :size="20" class="shrink-0" :class="isChosen(row.node.id) ? 'text-accent-text' : 'invisible'" aria-hidden="true" />
          <span class="flex min-w-0 flex-col">
            <span data-test="knowledge-row-name" class="truncate text-base text-ink" :class="isChosen(row.node.id) ? 'font-semibold' : ''">{{ row.node.name }}</span>
            <span v-if="row.meta" class="truncate text-xs text-ink-muted">{{ row.meta }}</span>
          </span>
        </button>
        <button
          v-if="row.opens > 0"
          type="button"
          data-test="knowledge-row-open"
          :aria-label="t('knowledgeFilter.openAriaLabel', { shown: openLabel(row.opens), name: row.node.name })"
          class="inline-flex min-h-12 shrink-0 items-center gap-1 pl-3 text-xs font-medium text-ink-muted hover:text-ink"
          @click="open(row)"
        >
          <span>{{ openLabel(row.opens) }}</span>
          <ChevronRight :size="16" aria-hidden="true" />
        </button>
      </li>
    </ul>
    <p v-if="query && rows.length === 0" class="text-sm text-ink-muted">{{ t(`knowledgeFilter.${kind}.noMatches`) }}</p>

    <p class="text-xs text-ink-muted">{{ t(`knowledgeFilter.${kind}.note`) }}</p>

    <PrimaryButton data-test="knowledge-done" class="mt-auto" @click="emit('done')">{{
      t(`knowledgeFilter.${kind}.done`, { count: chosen.length })
    }}</PrimaryButton>
  </div>
</template>
