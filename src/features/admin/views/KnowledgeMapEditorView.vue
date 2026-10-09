<script setup lang="ts">
import { ArrowLeft, Copy, FolderInput, Plus, Trash2 } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter, type LocationQueryRaw } from 'vue-router'

import { toApiLanguageCode } from '@/i18n'
import DeleteNodeModal from '@/features/admin/components/DeleteNodeModal.vue'
import KnowledgeLinksPanel from '@/features/admin/components/KnowledgeLinksPanel.vue'
import KnowledgeNodeForm from '@/features/admin/components/KnowledgeNodeForm.vue'
import KnowledgeTreeBrowser from '@/features/admin/components/KnowledgeTreeBrowser.vue'
import MoveNodeModal from '@/features/admin/components/MoveNodeModal.vue'
import NodePickerModal from '@/features/admin/components/NodePickerModal.vue'
import { useKnowledgeMap, type WriteOutcome } from '@/features/admin/composables/useKnowledgeMap'
import { refusalText } from '@/features/admin/utils/knowledgeMap'
import AppBar from '@/shared/components/AppBar.vue'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import { useIsCompact } from '@/shared/composables/useIsCompact'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useScopedLocale } from '@/shared/composables/useScopedLocale'
import { useToast } from '@/shared/composables/useToast'
import { useTypedT } from '@/shared/composables/useTypedT'
import { ancestorIds, toTreeNodes } from '@/shared/utils/skillConceptTree'
import type { components } from '@/api/generated/core-domain'

type KnowledgeNode = components['schemas']['KnowledgeNode']
type KnowledgeNodeKind = components['schemas']['KnowledgeNodeKind']
type MasteryLevel = components['schemas']['MasteryLevel']
type CreateKnowledgeNodeRequest = components['schemas']['CreateKnowledgeNodeRequest']
type UpdateKnowledgeNodeRequest = components['schemas']['UpdateKnowledgeNodeRequest']
type CreateKnowledgeEdgeRequest = components['schemas']['CreateKnowledgeEdgeRequest']

const KINDS: KnowledgeNodeKind[] = ['concept', 'skill']

const { isCompact } = useIsCompact()
const { t } = useTypedT()
const { localizedName } = useLocalizedName()
const locale = useScopedLocale()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const map = useKnowledgeMap()
const { nodes, edges } = map

const nodesById = computed(() => new Map(nodes.value.map((n) => [n.node_id, n])))
const existingKeys = computed(() => nodes.value.map((n) => n.key))

// ── Where the editor is, read from the URL ───────────────────────────────────

function queryString(name: string): string | null {
  const value = route.query[name]
  return typeof value === 'string' && value !== '' ? value : null
}
function asKind(value: string | null): KnowledgeNodeKind | null {
  return KINDS.find((kind) => kind === value) ?? null
}

const selectedId = computed(() => queryString('node'))
const selected = computed(() => (selectedId.value ? (nodesById.value.get(selectedId.value) ?? null) : null))
const newKind = computed(() => asKind(queryString('new')))
const newParent = computed(() => {
  const id = queryString('parent')
  return id ? (nodesById.value.get(id) ?? null) : null
})
const activeKind = computed<KnowledgeNodeKind>(
  () => selected.value?.kind ?? newKind.value ?? asKind(queryString('tree')) ?? 'concept',
)

function go(query: LocationQueryRaw) {
  return router.push({ name: 'admin-knowledge-map', query })
}

// ── The left pane ────────────────────────────────────────────────────────────

const languageCode = computed(() => toApiLanguageCode(locale.value))
function treeOf(kind: KnowledgeNodeKind) {
  return toTreeNodes(
    nodes.value.filter((n) => n.kind === kind),
    languageCode.value,
  )
}
const activeTree = computed(() => treeOf(activeKind.value))
function countOf(kind: KnowledgeNodeKind): number {
  return nodes.value.filter((n) => n.kind === kind).length
}
function kindLabel(kind: KnowledgeNodeKind): string {
  return t(kind === 'skill' ? 'knowledgeMap.tabs.skill' : 'knowledgeMap.tabs.concept')
}

const showTree = computed(() => !isCompact.value || (selectedId.value === null && newKind.value === null))

// ── The selected node ────────────────────────────────────────────────────────

const breadcrumb = computed(() => {
  const node = selected.value
  if (!node) return []
  const tree = treeOf(node.kind)
  const self = tree.find((n) => n.id === node.node_id)
  return self
    ? ancestorIds(tree, self)
        .reverse()
        .flatMap((id) => nodesById.value.get(id) ?? [])
    : []
})
const selectedKindNodes = computed(() => nodes.value.filter((n) => n.kind === selected.value?.kind))
const selectedParent = computed(() =>
  selected.value?.parent_id ? (nodesById.value.get(selected.value.parent_id) ?? null) : null,
)

function copyKey() {
  if (selected.value) void navigator.clipboard?.writeText(selected.value.key)
}

// ── Saving the form ──────────────────────────────────────────────────────────

const dirty = ref(false)
const saving = ref(false)
const formError = ref('')
const instrumentsError = ref('')

function clearFormErrors() {
  formError.value = ''
  instrumentsError.value = ''
}
watch([selectedId, newKind], clearFormErrors)

/** Shows a refused save where it belongs; true when the server never answered. */
function showRefusal(outcome: WriteOutcome<unknown>, touchedInstruments: boolean) {
  if (outcome.ok) return
  if (outcome.status === 0 || outcome.status >= 500) {
    toast.error(t('knowledgeMap.saveFailed'))
    return
  }
  // The server names the field either bare or as a JSON pointer.
  const onInstruments =
    outcome.fields.some((field) => field.field.replace(/^\//, '') === 'instrument_ids') ||
    (outcome.status === 409 && touchedInstruments)
  if (onInstruments) instrumentsError.value = refusalText(outcome)
  else formError.value = refusalText(outcome)
}

async function create(request: CreateKnowledgeNodeRequest) {
  clearFormErrors()
  saving.value = true
  const outcome = await map.createNode(request)
  saving.value = false
  if (!outcome.ok || !outcome.data) {
    showRefusal(outcome, false)
    return
  }
  dirty.value = false
  toast.success(t('knowledgeMap.saved'))
  await go({ tree: request.kind, node: outcome.data.node_id })
}

async function update(request: UpdateKnowledgeNodeRequest) {
  const node = selected.value
  if (!node) return
  clearFormErrors()
  saving.value = true
  const outcome = await map.updateNode(node.node_id, request)
  saving.value = false
  if (!outcome.ok) {
    showRefusal(outcome, request.instrument_ids !== undefined)
    return
  }
  dirty.value = false
  toast.success(t('knowledgeMap.saved'))
}

function startNew(parent: KnowledgeNode | null) {
  const kind = parent?.kind ?? activeKind.value
  void go(parent ? { tree: kind, new: kind, parent: parent.node_id } : { tree: kind, new: kind })
}

// ── Leaving unsaved changes ──────────────────────────────────────────────────

const discardOpen = ref(false)
let resolveDiscard: ((leave: boolean) => void) | null = null
/** Set while the editor changes the URL itself without leaving the form, e.g. a new node's parent. */
let keepingForm = false

function guardUnsaved() {
  if (!dirty.value || keepingForm) return true
  discardOpen.value = true
  return new Promise<boolean>((resolve) => (resolveDiscard = resolve))
}
function settleDiscard(leave: boolean) {
  discardOpen.value = false
  if (leave) dirty.value = false
  resolveDiscard?.(leave)
  resolveDiscard = null
}
onBeforeRouteUpdate(guardUnsaved)
onBeforeRouteLeave(guardUnsaved)

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (dirty.value) event.preventDefault()
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

// ── Choosing a new node's parent ─────────────────────────────────────────────

const parentPickerOpen = ref(false)
function chooseNewParent(parentId: string | null) {
  parentPickerOpen.value = false
  const kind = newKind.value
  if (!kind) return
  // The half-filled form stays: only the URL records the new parent.
  keepingForm = true
  void router
    .replace({
      name: 'admin-knowledge-map',
      query: parentId ? { tree: kind, new: kind, parent: parentId } : { tree: kind, new: kind },
    })
    .finally(() => {
      keepingForm = false
    })
}

// ── Moving and deleting ──────────────────────────────────────────────────────

const moveOpen = ref(false)
const moveError = ref('')
const moveBusy = ref(false)

function openMove() {
  moveError.value = ''
  moveOpen.value = true
}

async function move(parentId: string | null) {
  const node = selected.value
  if (!node) return
  moveBusy.value = true
  const outcome = await map.updateNode(node.node_id, { parent_id: parentId })
  moveBusy.value = false
  if (!outcome.ok) {
    moveError.value = outcome.status === 0 || outcome.status >= 500 ? t('knowledgeMap.saveFailed') : refusalText(outcome)
    return
  }
  moveOpen.value = false
  toast.success(t('knowledgeMap.saved'))
}

const deleteOpen = ref(false)
const deleteError = ref('')
const deleteBusy = ref(false)

function openDelete() {
  deleteError.value = ''
  deleteOpen.value = true
}

async function remove() {
  const node = selected.value
  if (!node) return
  deleteBusy.value = true
  const outcome = await map.deleteNode(node.node_id)
  deleteBusy.value = false
  if (!outcome.ok) {
    deleteError.value =
      outcome.status === 0 || outcome.status >= 500 ? t('knowledgeMap.saveFailed') : refusalText(outcome)
    return
  }
  deleteOpen.value = false
  dirty.value = false
  toast.success(t('knowledgeMap.deleted', { name: localizedName(node.names) }))
  await go(node.parent_id ? { tree: node.kind, node: node.parent_id } : { tree: node.kind })
}

// ── Links ────────────────────────────────────────────────────────────────────

const linkErrors = reactive<{ applies?: string; requires?: string }>({})
watch(selectedId, () => {
  linkErrors.applies = ''
  linkErrors.requires = ''
})

async function writeLink(type: 'applies' | 'requires', perform: () => Promise<WriteOutcome<unknown>>) {
  linkErrors[type] = ''
  const outcome = await perform()
  if (outcome.ok) return
  linkErrors[type] =
    outcome.status === 0 || outcome.status >= 500 ? t('knowledgeMap.saveFailed') : refusalText(outcome)
}

function addEdge(request: CreateKnowledgeEdgeRequest) {
  void writeLink(request.type, () => map.createEdge(request))
}
// A link with a change in flight takes no other change until it settles, so
// a double-click never sends the same removal twice.
const busyEdgeIds = ref<string[]>([])

async function writeEdge(edgeId: string, type: 'applies' | 'requires', perform: () => Promise<WriteOutcome<unknown>>) {
  if (busyEdgeIds.value.includes(edgeId)) return
  busyEdgeIds.value = [...busyEdgeIds.value, edgeId]
  try {
    await writeLink(type, perform)
  } finally {
    busyEdgeIds.value = busyEdgeIds.value.filter((id) => id !== edgeId)
  }
}

function changeLevel(edgeId: string, level: MasteryLevel) {
  void writeEdge(edgeId, 'requires', () => map.updateEdgeLevel(edgeId, level))
}
function removeEdge(edgeId: string) {
  const type = edges.value.find((edge) => edge.edge_id === edgeId)?.type ?? 'requires'
  void writeEdge(edgeId, type, () => map.deleteEdge(edgeId))
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <AppBar :compact="isCompact" :primary-nav-to="{ name: 'admin-knowledge-map' }" />

    <div class="flex flex-1 flex-col gap-4 px-4 pb-10 pt-6 sm:px-[48px] sm:pt-8">
      <h1 class="text-lg font-bold text-ink sm:text-xl">{{ t('knowledgeMap.heading') }}</h1>

      <LoadingSkeleton v-if="map.isLoading.value && nodes.length === 0" />
      <div v-else-if="map.loadFailed.value && nodes.length === 0" data-test="kmap-load-error">
        <LoadFailed :message="t('knowledgeMap.loadFailed')" @retry="map.reload" />
      </div>

      <div v-else class="grid min-h-0 flex-1 gap-6 md:grid-cols-[minmax(18rem,26rem)_minmax(0,1fr)]">
        <section
          v-if="showTree"
          data-test="kmap-tree-pane"
          class="flex h-[70vh] min-h-0 flex-col gap-3 md:sticky md:top-24"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex w-fit gap-1 rounded-lg bg-surface-sunken p-1" role="tablist">
              <button
                v-for="kind in KINDS"
                :key="kind"
                type="button"
                role="tab"
                :data-test="`kmap-tab-${kind}`"
                :aria-selected="activeKind === kind ? 'true' : 'false'"
                class="rounded-md px-3 py-1 text-xs font-semibold"
                :class="activeKind === kind ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
                @click="go({ tree: kind })"
              >
                {{ kindLabel(kind) }} ({{ countOf(kind) }})
              </button>
            </div>
            <button
              type="button"
              data-test="kmap-new"
              class="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[0.8125rem] font-semibold text-accent-fg"
              @click="startNew(null)"
            >
              <Plus :size="14" aria-hidden="true" />
              {{ activeKind === 'skill' ? t('knowledgeMap.newSkill') : t('knowledgeMap.newConcept') }}
            </button>
          </div>
          <KnowledgeTreeBrowser
            :key="activeKind"
            :label="kindLabel(activeKind)"
            :nodes="activeTree"
            :selected-id="selectedId"
            @select="go({ tree: activeKind, node: $event })"
          />
        </section>

        <section v-if="!showTree || !isCompact" class="flex min-w-0 flex-col gap-5">
          <button
            v-if="isCompact"
            type="button"
            data-test="kmap-back"
            class="flex w-fit items-center gap-1.5 text-sm font-semibold text-accent-text"
            @click="go({ tree: activeKind })"
          >
            <ArrowLeft :size="16" aria-hidden="true" />
            {{ t('knowledgeMap.back') }}
          </button>

          <template v-if="newKind">
            <h2 class="text-base font-bold text-ink">
              {{ newKind === 'skill' ? t('knowledgeMap.newSkill') : t('knowledgeMap.newConcept') }}
            </h2>
            <KnowledgeNodeForm
              :kind="newKind"
              :node="null"
              :parent="newParent"
              :existing-keys="existingKeys"
              :saving="saving"
              :error="formError"
              :instruments-error="instrumentsError"
              @create="create"
              @cancel="go({ tree: newKind })"
              @change-parent="parentPickerOpen = true"
              @dirty="dirty = $event"
            />
            <NodePickerModal
              :open="parentPickerOpen"
              :title="t('knowledgeMap.chooseParent')"
              :trees="[{ kind: newKind, nodes: treeOf(newKind) }]"
              :root-label="t('knowledgeMap.form.noParent')"
              @pick="chooseNewParent"
              @pick-root="chooseNewParent(null)"
              @close="parentPickerOpen = false"
            />
          </template>

          <template v-else-if="selected">
            <header class="flex flex-col gap-2">
              <nav v-if="breadcrumb.length > 0" data-test="kmap-breadcrumb" class="flex flex-wrap items-center gap-1 text-xs text-ink-subtle">
                <template v-for="(ancestor, index) in breadcrumb" :key="ancestor.node_id">
                  <span v-if="index > 0" aria-hidden="true">›</span>
                  <button type="button" class="hover:underline" @click="go({ tree: ancestor.kind, node: ancestor.node_id })">
                    {{ localizedName(ancestor.names) }}
                  </button>
                </template>
              </nav>
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 data-test="kmap-node-heading" class="text-lg font-bold text-ink">{{ localizedName(selected.names) }}</h2>
                <span class="rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-semibold text-ink-muted">{{
                  selected.kind === 'skill' ? t('knowledgeMap.kindSkill') : t('knowledgeMap.kindConcept')
                }}</span>
                <span class="flex items-center gap-1">
                  <code data-test="kmap-node-key" class="text-xs text-ink-muted">{{ selected.key }}</code>
                  <button
                    type="button"
                    class="flex h-6 w-6 items-center justify-center rounded text-ink-muted hover:bg-surface-sunken"
                    :aria-label="t('knowledgeMap.copyKey')"
                    @click="copyKey"
                  >
                    <Copy :size="13" aria-hidden="true" />
                  </button>
                </span>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  data-test="kmap-add-child"
                  class="flex items-center gap-1.5 rounded-md border border-border bg-surface-raised px-3 py-1.5 text-[0.8125rem] font-semibold text-ink"
                  @click="startNew(selected)"
                >
                  <Plus :size="14" aria-hidden="true" />
                  {{ t('knowledgeMap.addChild') }}
                </button>
                <button
                  type="button"
                  data-test="kmap-move"
                  class="flex items-center gap-1.5 rounded-md border border-border bg-surface-raised px-3 py-1.5 text-[0.8125rem] font-semibold text-ink"
                  @click="openMove"
                >
                  <FolderInput :size="14" aria-hidden="true" />
                  {{ t('knowledgeMap.moveButton') }}
                </button>
                <button
                  type="button"
                  data-test="kmap-delete"
                  class="flex items-center gap-1.5 rounded-md border border-border bg-surface-raised px-3 py-1.5 text-[0.8125rem] font-semibold text-danger"
                  @click="openDelete"
                >
                  <Trash2 :size="14" aria-hidden="true" />
                  {{ t('knowledgeMap.deleteButton') }}
                </button>
              </div>
            </header>

            <KnowledgeNodeForm
              :kind="selected.kind"
              :node="selected"
              :parent="selectedParent"
              :existing-keys="existingKeys"
              :saving="saving"
              :error="formError"
              :instruments-error="instrumentsError"
              @update="update"
              @dirty="dirty = $event"
            />

            <div class="border-t border-border pt-5">
              <KnowledgeLinksPanel
                :node="selected"
                :nodes="nodes"
                :edges="edges"
                :errors="linkErrors"
                :busy-edge-ids="busyEdgeIds"
                @add-edge="addEdge"
                @change-level="changeLevel"
                @remove-edge="removeEdge"
                @select="(id) => go({ tree: nodesById.get(id)?.kind ?? activeKind, node: id })"
              />
            </div>

            <MoveNodeModal
              :open="moveOpen"
              :node="selected"
              :nodes="selectedKindNodes"
              :error="moveError"
              :busy="moveBusy"
              @confirm="move"
              @cancel="moveOpen = false"
            />
            <DeleteNodeModal
              :open="deleteOpen"
              :node="selected"
              :nodes="nodes"
              :edges="edges"
              :error="deleteError"
              :busy="deleteBusy"
              @confirm="remove"
              @cancel="deleteOpen = false"
            />
          </template>

          <p v-else-if="selectedId" data-test="kmap-missing" class="text-sm text-ink-muted">
            {{ t('knowledgeMap.missing') }}
          </p>
          <p v-else data-test="kmap-empty" class="text-sm text-ink-muted">{{ t('knowledgeMap.empty') }}</p>
        </section>
      </div>
    </div>

    <div v-if="discardOpen" data-test="kmap-discard-dialog">
      <ConfirmDialog
        :open="discardOpen"
        :title="t('knowledgeMap.discardTitle')"
        :message="t('knowledgeMap.discardMessage')"
        :confirm-label="t('knowledgeMap.form.discard')"
        @confirm="settleDiscard(true)"
        @cancel="settleDiscard(false)"
      />
    </div>
  </div>
</template>
