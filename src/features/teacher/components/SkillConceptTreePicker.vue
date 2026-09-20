<script setup lang="ts">
import { Plus, X } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

export interface TreeNode {
  id: string
  name: string
  parent_id: string | null
}

interface ParentOption {
  id: string | null
  label: string
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

const { t } = useTypedT()

const labelLower = computed(() => props.label.toLowerCase())

const isOpen = ref(false)
const search = ref('')
const createName = ref('')
const createParentId = ref('')
const parentQuery = ref('')
const parentDropdownOpen = ref(false)
const parentFieldRef = ref<HTMLElement | null>(null)
const duplicateName = ref(false)

const nodesById = computed(() => new Map(props.nodes.map((n) => [n.id, n])))
const childrenByParentId = computed(() => {
  const map = new Map<string, TreeNode[]>()
  for (const node of props.nodes) {
    if (!node.parent_id) continue
    const siblings = map.get(node.parent_id) ?? []
    siblings.push(node)
    map.set(node.parent_id, siblings)
  }
  return map
})

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

/** A node's ancestor ids, root-first excluded — nearest parent first. */
function ancestorIds(node: TreeNode): string[] {
  const ids: string[] = []
  let current = node
  while (current.parent_id) {
    const parent = nodesById.value.get(current.parent_id)
    if (!parent) break
    ids.push(parent.id)
    current = parent
  }
  return ids
}

function descendantIds(id: string): string[] {
  const children = childrenByParentId.value.get(id) ?? []
  return children.flatMap((child) => [child.id, ...descendantIds(child.id)])
}

function openPicker() {
  isOpen.value = true
}

function closePicker() {
  isOpen.value = false
  parentDropdownOpen.value = false
}

function onModalBodyClick(event: MouseEvent) {
  if (!parentDropdownOpen.value) return
  if (parentFieldRef.value?.contains(event.target as Node)) return
  parentDropdownOpen.value = false
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
    if (checked) closePicker()
    return
  }
  if (checked) {
    const node = nodesById.value.get(id)
    const withAncestors = node ? [id, ...ancestorIds(node)] : [id]
    emit('update:selectedIds', Array.from(new Set([...props.selectedIds, ...withAncestors])))
    return
  }
  // Unchecking a node also drops its descendants — a child can never stay
  // selected once its own ancestor chain is broken.
  const toRemove = new Set([id, ...descendantIds(id)])
  emit(
    'update:selectedIds',
    props.selectedIds.filter((i) => !toRemove.has(i)),
  )
}

function removeSelected(id: string) {
  const toRemove = new Set([id, ...descendantIds(id)])
  emit(
    'update:selectedIds',
    props.selectedIds.filter((i) => !toRemove.has(i)),
  )
}

function hasSibling(name: string, parentId: string | null): boolean {
  const normalized = name.trim().toLowerCase()
  return props.nodes.some(
    (n) => (n.parent_id ?? null) === parentId && n.name.trim().toLowerCase() === normalized,
  )
}

const parentOptions = computed<ParentOption[]>(() => {
  const query = parentQuery.value.trim().toLowerCase()
  const rootOption: ParentOption = { id: null, label: t('skillConceptTreePicker.noParentRoot') }
  const nodeOptions: ParentOption[] = props.nodes
    .map((n) => ({ id: n.id, label: breadcrumb(n) }))
    .filter((option) => !query || option.label.toLowerCase().includes(query))
    .sort((a, b) => a.label.localeCompare(b.label))
  return !query || rootOption.label.toLowerCase().includes(query) ? [rootOption, ...nodeOptions] : nodeOptions
})

function chooseParent(option: ParentOption) {
  createParentId.value = option.id ?? ''
  parentQuery.value = option.id ? option.label : ''
  parentDropdownOpen.value = false
  duplicateName.value = false
}

function clearParent() {
  createParentId.value = ''
  parentQuery.value = ''
  duplicateName.value = false
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
  parentQuery.value = ''
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
          :aria-label="t('skillConceptTreePicker.removeSelectedAriaLabel', { name: node.name })"
          @click="removeSelected(node.id)"
        >
          <X :size="11" :stroke-width="2.4" aria-hidden="true" />
        </button>
      </span>
    </div>

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
      <div class="contents" @click="onModalBodyClick">
        <div class="flex items-center justify-between">
          <span class="text-base font-bold">{{ t('skillConceptTreePicker.modalTitle', { label: labelLower }) }}</span>
          <ModalCloseButton @close="closePicker" />
        </div>

        <input
          v-model="search"
          data-test="tree-search"
          type="text"
          :placeholder="t('skillConceptTreePicker.search')"
          class="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm"
        />

        <p v-if="isLoading" data-test="tree-loading" class="text-sm text-ink-subtle">
          {{ t('skillConceptTreePicker.loading') }}
        </p>
        <p v-else-if="visibleNodes.length === 0" data-test="tree-empty" class="text-sm text-ink-subtle">
          {{ t('skillConceptTreePicker.empty') }}
        </p>
        <ul v-else class="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border border-border bg-surface-sunken p-1.5">
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

        <div class="flex flex-col gap-1.5 border-t border-border pt-2.5">
          <span class="text-xs font-semibold text-ink-subtle">{{ t('skillConceptTreePicker.createHeading') }}</span>
          <input
            v-model="createName"
            data-test="tree-create-name"
            type="text"
            :placeholder="t('skillConceptTreePicker.createNamePlaceholder', { label: labelLower })"
            class="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm"
            @input="duplicateName = false"
          />

          <div ref="parentFieldRef" class="relative">
            <div class="flex items-center gap-1.5">
              <input
                v-model="parentQuery"
                data-test="tree-create-parent-search"
                type="text"
                :placeholder="t('skillConceptTreePicker.parentSearchPlaceholder')"
                class="flex-1 rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm"
                @focus="parentDropdownOpen = true"
                @input="parentDropdownOpen = true"
              />
              <button
                v-if="createParentId"
                type="button"
                data-test="tree-create-parent-clear"
                class="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md border border-border text-ink-muted"
                :aria-label="t('skillConceptTreePicker.clearParentAriaLabel')"
                @click="clearParent"
              >
                <X :size="13" aria-hidden="true" />
              </button>
            </div>

            <ul
              v-if="parentDropdownOpen && parentOptions.length > 0"
              data-test="tree-create-parent-options"
              class="absolute z-10 mt-1 flex max-h-40 w-full flex-col gap-0.5 overflow-y-auto rounded-md border border-border bg-surface-raised p-1 shadow-level2"
            >
              <li v-for="option in parentOptions" :key="option.id ?? 'root'">
                <button
                  type="button"
                  data-test="tree-create-parent-option"
                  :data-node-id="option.id ?? 'root'"
                  class="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-sunken"
                  @click="chooseParent(option)"
                >
                  {{ option.label }}
                </button>
              </li>
            </ul>
          </div>

          <button
            type="button"
            data-test="tree-create-submit"
            class="w-fit rounded-md border border-border bg-surface-sunken px-3 py-2 text-[0.8125rem] font-semibold"
            @click="submitCreate"
          >
            {{ t('skillConceptTreePicker.createSubmit') }}
          </button>
          <p v-if="duplicateName" data-test="tree-create-duplicate" class="text-[0.8125rem] text-danger">
            {{ t('skillConceptTreePicker.duplicateName', { name: createName.trim() }) }}
          </p>
        </div>
      </div>
    </ModalOverlay>
  </div>
</template>
