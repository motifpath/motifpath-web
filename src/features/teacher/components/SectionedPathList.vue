<script lang="ts">
export interface PathBuilderItem {
  content_node_id: string
  title: string
  content_type: 'video' | 'article'
  section_label?: string
}
</script>

<script setup lang="ts">
import { ArrowRight, Tag, Trash2 } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import type { LessonStates } from '@/features/teacher/utils/pathRequirements'
import OrderedList from '@/shared/components/OrderedList.vue'
import OrderedRow, { type OrderedRowAction } from '@/shared/components/OrderedRow.vue'
import TextEntrySheet from '@/shared/components/TextEntrySheet.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{
  items: PathBuilderItem[]
  /** Which lessons learners can get; a lesson whose state isn't known says only what it is. */
  lessons: LessonStates
}>()
const emit = defineEmits<{
  reorder: [fromIndex: number, toIndex: number]
  relabel: [index: number, sectionLabel: string]
  remove: [index: number]
}>()

const { t } = useTypedT()
const router = useRouter()

// Consecutive items sharing the same section_label (including consecutive unlabeled items) show
// under one heading -- there is no separate section entity, just a label carried on each item.
function startsSection(index: number): boolean {
  return index === 0 || props.items[index - 1]?.section_label !== props.items[index]?.section_label
}

const actions = computed<OrderedRowAction[]>(() => [
  { id: 'section', label: t('sectionedPathList.section'), icon: Tag },
  { id: 'open', label: t('sectionedPathList.open'), icon: ArrowRight },
  { id: 'remove', label: t('sectionedPathList.remove'), icon: Trash2, danger: true },
])

function metaOf(item: PathBuilderItem): string {
  const kind = t(`common.contentTypes.${item.content_type}`)
  if (!props.lessons.known.has(item.content_node_id)) return kind
  const state = props.lessons.published.has(item.content_node_id)
    ? t('sectionedPathList.published')
    : t('sectionedPathList.draftPublishFirst')
  return `${kind} · ${state}`
}

function blocksPublishing(item: PathBuilderItem): boolean {
  return props.lessons.known.has(item.content_node_id) && !props.lessons.published.has(item.content_node_id)
}

const labellingIndex = ref<number | null>(null)
const labelling = computed(() => (labellingIndex.value === null ? null : (props.items[labellingIndex.value] ?? null)))

function onAction(index: number, id: string) {
  const item = props.items[index]
  if (!item) return
  if (id === 'section') labellingIndex.value = index
  else if (id === 'open') void router.push({ name: 'teacher-content-edit', params: { id: item.content_node_id } })
  else if (id === 'remove') emit('remove', index)
}

function confirmSection(value: string) {
  if (labellingIndex.value !== null) emit('relabel', labellingIndex.value, value)
  labellingIndex.value = null
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <p v-if="items.length === 0" data-test="path-empty" class="text-sm text-ink-subtle">
      {{ t('sectionedPathList.emptyMessage') }}
    </p>

    <OrderedList v-else @move="(from, to) => emit('reorder', from, to)">
      <template v-for="(item, index) in items" :key="item.content_node_id">
        <li
          v-if="startsSection(index)"
          data-test="path-section-heading"
          role="presentation"
          class="pt-2 text-xs font-semibold uppercase tracking-wider text-ink-muted first:pt-0"
        >
          {{ item.section_label || t('sectionedPathList.noSection') }}
        </li>
        <OrderedRow
          :index="index"
          :count="items.length"
          :title="`${index + 1} · ${item.title}`"
          :meta="metaOf(item)"
          :meta-tone="blocksPublishing(item) ? 'warning' : 'muted'"
          :actions="actions"
          @action="onAction(index, $event)"
        />
      </template>
    </OrderedList>

    <TextEntrySheet
      :open="labelling !== null"
      :title="t('sectionedPathList.section')"
      :label="t('sectionedPathList.sectionLabel')"
      :hint="t('sectionedPathList.sectionHint')"
      :value="labelling?.section_label ?? ''"
      :confirm-label="t('sectionedPathList.sectionConfirm')"
      @confirm="confirmSection"
      @close="labellingIndex = null"
    />
  </div>
</template>
