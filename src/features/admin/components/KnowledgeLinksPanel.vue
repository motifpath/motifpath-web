<script setup lang="ts">
import { Plus, X } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

import { toApiLanguageCode } from '@/i18n'
import NodePickerModal from '@/features/admin/components/NodePickerModal.vue'
import { requiresChain } from '@/features/admin/utils/knowledgeMap'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useScopedLocale } from '@/shared/composables/useScopedLocale'
import { useTypedT } from '@/shared/composables/useTypedT'
import { toTreeNodes } from '@/shared/utils/skillConceptTree'
import type { components } from '@/api/generated/core-domain'

type KnowledgeNode = components['schemas']['KnowledgeNode']
type KnowledgeEdge = components['schemas']['KnowledgeEdge']
type KnowledgeEdgeType = components['schemas']['KnowledgeEdgeType']
type MasteryLevel = components['schemas']['MasteryLevel']
type CreateKnowledgeEdgeRequest = components['schemas']['CreateKnowledgeEdgeRequest']

const props = withDefaults(
  defineProps<{
    node: KnowledgeNode
    /** Every node of both kinds. */
    nodes: KnowledgeNode[]
    /** Every edge of both types. */
    edges: KnowledgeEdge[]
    /** The server's reason for refusing the last change to each list. */
    errors?: { applies?: string; requires?: string }
    /** Links with a change still being saved; they can't be changed again until it settles. */
    busyEdgeIds?: string[]
  }>(),
  { errors: () => ({}), busyEdgeIds: () => [] },
)
const emit = defineEmits<{
  addEdge: [request: CreateKnowledgeEdgeRequest]
  changeLevel: [edgeId: string, level: MasteryLevel]
  removeEdge: [edgeId: string]
  select: [nodeId: string]
}>()

const LEVELS: MasteryLevel[] = ['accurate', 'fluent', 'retained']

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
const locale = useScopedLocale()

const nodesById = computed(() => new Map(props.nodes.map((n) => [n.node_id, n])))
function nameOf(id: string): string {
  const found = nodesById.value.get(id)
  return found ? localizedName(found.names) : ''
}

function levelLabel(level: MasteryLevel | null): string {
  if (level === 'fluent') return t('knowledgeMap.links.levels.fluent')
  if (level === 'retained') return t('knowledgeMap.links.levels.retained')
  return t('knowledgeMap.links.levels.accurate')
}

interface Link {
  edge: KnowledgeEdge
  /** The node at the other end. */
  otherId: string
}

function links(type: KnowledgeEdgeType, direction: 'out' | 'in'): Link[] {
  return props.edges
    .filter((edge) => edge.type === type && (direction === 'out' ? edge.from_id : edge.to_id) === props.node.node_id)
    .map((edge) => ({ edge, otherId: direction === 'out' ? edge.to_id : edge.from_id }))
    .sort((a, b) => nameOf(a.otherId).localeCompare(nameOf(b.otherId)))
}

const isSkill = computed(() => props.node.kind === 'skill')
const applies = computed(() => links('applies', 'out'))
const requires = computed(() => links('requires', 'out'))
const requiredBy = computed(() => links('requires', 'in'))
const appliedBy = computed(() => links('applies', 'in'))

// A loop the editor caught itself, before asking the server. Cleared when
// the node changes or the admin tries again.
const loopMessage = ref('')
watch(
  () => props.node.node_id,
  () => {
    loopMessage.value = ''
  },
)

const picking = ref<KnowledgeEdgeType | null>(null)

const languageCode = computed(() => toApiLanguageCode(locale.value))
function treeOf(kind: 'skill' | 'concept') {
  return {
    kind,
    nodes: toTreeNodes(
      props.nodes.filter((n) => n.kind === kind),
      languageCode.value,
    ),
  }
}
const pickerTrees = computed(() =>
  picking.value === 'applies' ? [treeOf('concept')] : [treeOf('concept'), treeOf('skill')],
)
const pickerTitle = computed(() =>
  t(picking.value === 'applies' ? 'knowledgeMap.links.addAppliesTitle' : 'knowledgeMap.links.addRequiresTitle', {
    name: localizedName(props.node.names),
  }),
)

function pickerDisabledReason(id: string): string | null {
  if (id === props.node.node_id) return t('knowledgeMap.links.thisNode')
  const linked = picking.value === 'applies' ? applies.value : requires.value
  return linked.some((link) => link.otherId === id) ? t('knowledgeMap.links.alreadyLinked') : null
}

function openPicker(type: KnowledgeEdgeType) {
  loopMessage.value = ''
  picking.value = type
}

function pick(id: string) {
  const type = picking.value
  picking.value = null
  if (type === 'applies') {
    emit('addEdge', { from_id: props.node.node_id, to_id: id, type: 'applies' })
    return
  }
  // The new link would close a loop when the picked node already requires
  // this one, directly or through others.
  const chain = requiresChain(props.edges, id, props.node.node_id)
  if (chain) {
    const names = { from: nameOf(id), to: localizedName(props.node.names) }
    const via = chain.slice(1, -1).map(nameOf)
    loopMessage.value =
      via.length === 0
        ? t('knowledgeMap.links.loop', names)
        : t('knowledgeMap.links.loopThrough', { ...names, via: via.join(', ') })
    return
  }
  emit('addEdge', { from_id: props.node.node_id, to_id: id, type: 'requires', level: 'accurate' })
}

function onLevel(edgeId: string, event: Event) {
  if (!(event.target instanceof HTMLSelectElement)) return
  const value = event.target.value
  const level = LEVELS.find((candidate) => candidate === value)
  if (level) emit('changeLevel', edgeId, level)
}

const sections = computed(() => {
  const list: {
    name: 'applies' | 'requires' | 'required-by' | 'applied-by'
    heading: string
    links: Link[]
    editable: boolean
    showLevel: boolean
    error: string
  }[] = []
  if (isSkill.value) {
    list.push({
      name: 'applies',
      heading: t('knowledgeMap.links.applies'),
      links: applies.value,
      editable: true,
      showLevel: false,
      error: props.errors.applies ?? '',
    })
  }
  list.push({
    name: 'requires',
    heading: t('knowledgeMap.links.requires'),
    links: requires.value,
    editable: true,
    showLevel: true,
    error: loopMessage.value || (props.errors.requires ?? ''),
  })
  list.push({
    name: 'required-by',
    heading: t('knowledgeMap.links.requiredBy'),
    links: requiredBy.value,
    editable: false,
    showLevel: true,
    error: '',
  })
  if (!isSkill.value) {
    list.push({
      name: 'applied-by',
      heading: t('knowledgeMap.links.appliedBy'),
      links: appliedBy.value,
      editable: false,
      showLevel: false,
      error: '',
    })
  }
  return list
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <section
      v-for="section in sections"
      :key="section.name"
      :data-test="`kmap-links-${section.name}`"
      class="flex flex-col gap-2"
    >
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{{ section.heading }}</h3>
        <button
          v-if="section.editable"
          type="button"
          :data-test="`kmap-add-${section.name}`"
          class="flex items-center gap-1 rounded-md border border-border bg-surface-raised px-2.5 py-1 text-[0.8125rem] font-semibold text-ink"
          @click="openPicker(section.name === 'applies' ? 'applies' : 'requires')"
        >
          <Plus :size="14" aria-hidden="true" />
          {{ t('knowledgeMap.links.add') }}
        </button>
      </div>
      <p v-if="section.links.length === 0" class="text-sm text-ink-subtle">{{ t('knowledgeMap.links.none') }}</p>
      <ul v-else class="flex flex-col gap-1">
        <li
          v-for="link in section.links"
          :key="link.edge.edge_id"
          data-test="kmap-link-row"
          class="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-1.5 text-sm"
        >
          <button
            type="button"
            data-test="kmap-link-node"
            class="min-w-0 flex-1 truncate text-left font-semibold text-accent-text underline-offset-2 hover:underline"
            @click="emit('select', link.otherId)"
          >
            {{ nameOf(link.otherId) }}
          </button>
          <template v-if="section.showLevel">
            <select
              v-if="section.editable"
              data-test="kmap-link-level"
              :value="link.edge.level ?? 'accurate'"
              :disabled="busyEdgeIds.includes(link.edge.edge_id)"
              :aria-label="t('knowledgeMap.links.levelAriaLabel', { name: nameOf(link.otherId) })"
              class="rounded-md border border-border bg-surface-sunken px-2 py-1 text-xs"
              @change="onLevel(link.edge.edge_id, $event)"
            >
              <option v-for="level in LEVELS" :key="level" :value="level">{{ levelLabel(level) }}</option>
            </select>
            <span v-else data-test="kmap-link-level-label" class="text-xs text-ink-muted">{{
              levelLabel(link.edge.level)
            }}</span>
          </template>
          <button
            v-if="section.editable"
            type="button"
            data-test="kmap-link-remove"
            :disabled="busyEdgeIds.includes(link.edge.edge_id)"
            class="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50"
            :aria-label="t('knowledgeMap.links.removeAriaLabel', { name: nameOf(link.otherId) })"
            @click="emit('removeEdge', link.edge.edge_id)"
          >
            <X :size="14" aria-hidden="true" />
          </button>
        </li>
      </ul>
      <p v-if="section.error" data-test="kmap-links-error" role="alert" class="text-xs text-danger">
        {{ section.error }}
      </p>
    </section>

    <NodePickerModal
      :open="picking !== null"
      :title="pickerTitle"
      :trees="pickerTrees"
      :disabled-reason="pickerDisabledReason"
      @pick="pick"
      @close="picking = null"
    />
  </div>
</template>
