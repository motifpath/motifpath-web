<script setup lang="ts">
/**
 * Discover's filters, changed as a draft: a bottom sheet on a phone, a 480 px dialog from a tablet
 * up, with the same fields in both. Show follows each change with how many the draft would show
 * ("Show 2 courses") and applies it; × leaves the list as it was. The teacher list replaces the
 * layer's content, with a back arrow, so a sheet never opens on a sheet.
 */
import { computed, onScopeDispose, ref, useId, watch } from 'vue'

import DiscoverFilterFields from '@/features/student/components/DiscoverFilterFields.vue'
import DiscoverTeacherPicker, { type ChosenTeacher } from '@/features/student/components/DiscoverTeacherPicker.vue'
import type { DiscoverSegment } from '@/features/student/composables/useDiscoverState'
import type { DiscoverFilters } from '@/features/student/utils/discoverQuery'
import AppButton from '@/shared/components/AppButton.vue'
import OverlayLayer from '@/shared/components/OverlayLayer.vue'
import SheetHeader from '@/shared/components/SheetHeader.vue'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{
  open: boolean
  segment: DiscoverSegment
  /** The filters applied to the list now. */
  filters: DiscoverFilters
  /** How many items a choice of filters would show; null when it can't be counted. */
  count: (filters: DiscoverFilters) => Promise<number | null>
  instruments: { id: string; name: string }[]
  /** The applied teacher's name, once known. */
  teacherName: string | null
}>()
const emit = defineEmits<{ apply: [filters: DiscoverFilters]; close: [] }>()

const { t, locale } = useTypedT()
const { isCompact } = useSizeClass()
const titleId = useId()

const COUNT_DEBOUNCE_MS = 250

function copy(filters: DiscoverFilters): DiscoverFilters {
  return { ...filters, levels: [...filters.levels], skills: [...filters.skills], concepts: [...filters.concepts] }
}

const draft = ref<DiscoverFilters>(copy(props.filters))
const draftTeacherName = ref<string | null>(props.teacherName)
const page = ref<'filters' | 'teacher'>('filters')
const total = ref<number | null>(null)

watch(
  () => props.open,
  (open) => {
    if (!open) return recount()
    draft.value = copy(props.filters)
    draftTeacherName.value = props.teacherName
    page.value = 'filters'
  },
)
watch(
  () => props.teacherName,
  (name) => {
    if (draft.value.teacher === props.filters.teacher) draftTeacherName.value = name
  },
)

// Only the newest count may show: an older one that answers late would name the wrong total.
// A closed layer counts nothing; opening it sets the draft, which counts it.
let latestCount = 0
let countTimer: ReturnType<typeof setTimeout> | undefined
function recount() {
  clearTimeout(countTimer)
  const request = ++latestCount
  if (!props.open) return
  countTimer = setTimeout(async () => {
    const counted = await props.count(copy(draft.value))
    if (request === latestCount) total.value = counted
  }, COUNT_DEBOUNCE_MS)
}
watch(draft, recount, { deep: true, immediate: true })
onScopeDispose(() => clearTimeout(countTimer))

const title = computed(() => (page.value === 'teacher' ? t('discoverFilters.groups.teacher') : t('discoverFilters.title')))

const showLabel = computed(() =>
  total.value === null
    ? t('discoverFilters.showUnknown')
    : t(`discoverFilters.show.${props.segment}`, {
        count: total.value,
        shown: new Intl.NumberFormat(locale.value).format(total.value),
      }),
)

function clearAll() {
  draft.value = { levels: [], skills: [], concepts: [] }
}

function chooseTeacher(teacher: ChosenTeacher | null) {
  const next = copy(draft.value)
  if (teacher) next.teacher = teacher.user_id
  else delete next.teacher
  draft.value = next
  draftTeacherName.value = teacher?.display_name ?? null
  page.value = 'filters'
}

function apply() {
  emit('apply', copy(draft.value))
  emit('close')
}

// Esc, Back or a tap beside it closes the teacher list first, then the filters.
function onLayerClose() {
  if (page.value === 'teacher') page.value = 'filters'
  else emit('close')
}
</script>

<template>
  <OverlayLayer :open="open" :placement="isCompact ? 'bottom' : 'center'" @close="onLayerClose">
    <div
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :data-test="isCompact ? 'overlay-sheet' : 'overlay-dialog'"
      class="flex max-h-[90vh] flex-col bg-surface-raised shadow-level3"
      :class="isCompact ? 'w-full rounded-t-xl' : 'w-[min(30rem,calc(100vw-2rem))] rounded-xl'"
    >
      <SheetHeader
        :title="title"
        :title-id="titleId"
        :kind="isCompact ? 'sheet' : 'dialog'"
        :back="page === 'teacher'"
        @close="emit('close')"
        @back="page = 'filters'"
      />

      <div data-test="filters-body" class="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-4 pt-2">
        <DiscoverFilterFields
          v-if="page === 'filters'"
          v-model="draft"
          :instruments="instruments"
          :teacher-name="draftTeacherName"
          @open-teacher="page = 'teacher'"
        />
        <DiscoverTeacherPicker
          v-else
          :scope="segment === 'courses' ? 'catalog' : 'path-catalog'"
          :model-value="draft.teacher"
          @choose="chooseTeacher"
        />
      </div>

      <!-- Fixed below what scrolls, so its actions are always in reach. -->
      <footer
        v-if="page === 'filters'"
        data-test="filters-footer"
        class="shrink-0 border-t border-border px-5 pt-3"
        :class="{ 'pb-safe': isCompact }"
      >
        <div class="mb-3 flex items-center gap-2" :class="{ 'justify-end': !isCompact }">
          <AppButton data-test="filters-clear-all" variant="tertiary" @click="clearAll">
            {{ t('filters.clearAll') }}
          </AppButton>
          <AppButton data-test="filters-show" :block="isCompact" @click="apply">{{ showLabel }}</AppButton>
        </div>
      </footer>
    </div>
  </OverlayLayer>
</template>
