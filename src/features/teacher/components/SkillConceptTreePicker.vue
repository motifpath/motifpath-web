<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { computed, ref } from 'vue'

export interface TreeNode {
  id: string
  name: string
  parent_id: string | null
}

const props = withDefaults(
  defineProps<{
    label: string
    nodes: TreeNode[]
    selectedIds: string[]
    /** false renders radios and keeps selectedIds to at most one entry — used for a Challenge's single subject. */
    multiple?: boolean
    isLoading?: boolean
    /** Restricts which nodes can be browsed/picked, e.g. to a content node's own linked classification. */
    allowedIds?: string[] | null
  }>(),
  { multiple: true, isLoading: false, allowedIds: null },
)
const emit = defineEmits<{
  'update:selectedIds': [ids: string[]]
  create: [{ name: string; parentId: string | null }]
}>()

const search = ref('')
const createName = ref('')
const createParentId = ref('')
const duplicateName = ref(false)

const nodesById = computed(() => new Map(props.nodes.map((n) => [n.id, n])))

function breadcrumb(node: TreeNode): string {
  const path = [node.name]
  let current = node
  while (current.parent_id) {
    const parent = nodesById.value.get(current.parent_id)
    if (!parent) break
    path.unshift(parent.name)
    current = parent
  }
  return path.join(' > ')
}

const visibleNodes = computed(() => {
  const query = search.value.trim().toLowerCase()
  return props.nodes
    .filter((node) => !props.allowedIds || props.allowedIds.includes(node.id))
    .filter((node) => !query || breadcrumb(node).toLowerCase().includes(query))
    .sort((a, b) => breadcrumb(a).localeCompare(breadcrumb(b)))
})

const selectedNodes = computed(() =>
  props.selectedIds.map((id) => nodesById.value.get(id)).filter((n): n is TreeNode => !!n),
)

function isSelected(id: string): boolean {
  return props.selectedIds.includes(id)
}

function toggle(id: string, checked: boolean) {
  if (!props.multiple) {
    emit('update:selectedIds', checked ? [id] : [])
    return
  }
  const next = checked ? [...props.selectedIds, id] : props.selectedIds.filter((i) => i !== id)
  emit('update:selectedIds', next)
}

function removeSelected(id: string) {
  emit(
    'update:selectedIds',
    props.selectedIds.filter((i) => i !== id),
  )
}

function hasSibling(name: string, parentId: string | null): boolean {
  const normalized = name.trim().toLowerCase()
  return props.nodes.some(
    (n) => (n.parent_id ?? null) === parentId && n.name.trim().toLowerCase() === normalized,
  )
}

function submitCreate() {
  const name = createName.value.trim()
  if (!name) return
  if (hasSibling(name, createParentId.value || null)) {
    duplicateName.value = true
    return
  }
  emit('create', { name, parentId: createParentId.value || null })
  createName.value = ''
  createParentId.value = ''
  duplicateName.value = false
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
        class="flex items-center gap-1.5 rounded-full bg-accent-muted py-[5px] pl-3 pr-1.5 text-[0.8125rem] font-semibold text-accent-text"
      >
        {{ breadcrumb(node) }}
        <button
          v-if="multiple"
          type="button"
          data-test="tree-selected-chip-remove"
          class="flex h-[18px] w-[18px] items-center justify-center rounded-full text-accent-text"
          :aria-label="`Remove ${node.name}`"
          @click="removeSelected(node.id)"
        >
          <X :size="11" :stroke-width="2.4" aria-hidden="true" />
        </button>
      </span>
    </div>

    <input
      v-model="search"
      data-test="tree-search"
      type="text"
      placeholder="Search by name"
      class="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm"
    />

    <p v-if="isLoading" data-test="tree-loading" class="text-sm text-ink-subtle">Loading…</p>
    <p v-else-if="visibleNodes.length === 0" data-test="tree-empty" class="text-sm text-ink-subtle">
      No matching nodes yet — create one below.
    </p>
    <ul v-else class="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border border-border bg-surface-raised p-1.5">
      <li
        v-for="node in visibleNodes"
        :key="node.id"
        data-test="tree-node-row"
        class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-sunken"
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

    <div class="flex flex-col gap-1.5 border-t border-border pt-2.5">
      <div class="flex flex-wrap items-center gap-2">
        <input
          v-model="createName"
          data-test="tree-create-name"
          type="text"
          placeholder="New node name"
          class="min-w-[140px] flex-1 rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
          @input="duplicateName = false"
        />
        <select
          v-model="createParentId"
          data-test="tree-create-parent"
          class="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
          @change="duplicateName = false"
        >
          <option value="">No parent (root)</option>
          <option v-for="node in nodes" :key="node.id" :value="node.id">{{ breadcrumb(node) }}</option>
        </select>
        <button
          type="button"
          data-test="tree-create-submit"
          class="rounded-md border border-border bg-surface-raised px-3 py-2 text-[0.8125rem] font-semibold"
          @click="submitCreate"
        >
          Add
        </button>
      </div>
      <p v-if="duplicateName" data-test="tree-create-duplicate" class="text-[0.8125rem] text-danger">
        A node named "{{ createName.trim() }}" already exists under that parent — pick it from the list above
        instead of creating a near-duplicate.
      </p>
    </div>
  </div>
</template>
