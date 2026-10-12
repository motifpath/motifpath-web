<script setup lang="ts">
/**
 * A Teach list's filters on a phone (full screen) or a tablet (a dialog): every filter the
 * section takes, changed as a draft. The button at the foot follows each change with how many
 * items the draft would show ("Show 46 diagrams"), and applies it; × leaves the list as it was.
 * Skill, Concept and Author each open their own page inside the layer.
 */
import { ArrowLeft, X } from 'lucide-vue-next'
import { computed, onScopeDispose, ref, useId, watch } from 'vue'

import AuthorFilterPicker from '@/features/teacher/components/AuthorFilterPicker.vue'
import AuthoringFilterFields from '@/features/teacher/components/AuthoringFilterFields.vue'
import KnowledgeFilterPicker from '@/features/teacher/components/KnowledgeFilterPicker.vue'
import {
  type AuthoringListFilters,
  type AuthoringSection,
  CREATORS_SCOPE,
} from '@/features/teacher/utils/authoringListQuery'
import OverlayLayer from '@/shared/components/OverlayLayer.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { TreeNode } from '@/shared/utils/skillConceptTree'

const props = defineProps<{
  open: boolean
  section: AuthoringSection
  /** The filters applied to the list now. */
  filters: AuthoringListFilters
  /** How many items a choice of filters would show; null when it can't be counted. */
  count: (filters: AuthoringListFilters) => Promise<number | null>
  instruments: { id: string; name: string }[]
  skillNodes: TreeNode[]
  conceptNodes: TreeNode[]
  me: { user_id: string; display_name: string } | null
  authorName: string | null
}>()
const emit = defineEmits<{ apply: [filters: AuthoringListFilters]; close: [] }>()

const { t, locale } = useTypedT()
const { isCompact } = useSizeClass()
const titleId = useId()

const COUNT_DEBOUNCE_MS = 250

type Page = 'filters' | 'skills' | 'concepts' | 'author'

function copy(filters: AuthoringListFilters): AuthoringListFilters {
  return { ...filters, skills: [...filters.skills], concepts: [...filters.concepts] }
}

const draft = ref<AuthoringListFilters>(copy(props.filters))
const page = ref<Page>('filters')
const total = ref<number | null>(null)

watch(
  () => props.open,
  (open) => {
    if (!open) return recount()
    draft.value = copy(props.filters)
    page.value = 'filters'
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

const title = computed(() => {
  if (page.value === 'skills') return t('knowledgeFilter.skill.title')
  if (page.value === 'concepts') return t('knowledgeFilter.concept.title')
  if (page.value === 'author') return t('authorFilter.title')
  return t('authoringFilters.title')
})

const showLabel = computed(() =>
  total.value === null
    ? t('authoringFilters.showUnknown')
    : t(`authoringFilters.show.${props.section}`, {
        count: total.value,
        shown: new Intl.NumberFormat(locale.value).format(total.value),
      }),
)

/** Done on the Skills or Concepts page, with how many are chosen ("Done · 2 skills"). */
const doneLabel = computed(() => {
  const key = page.value === 'concepts' ? 'concepts' : 'skills'
  return t(`knowledgeFilter.${key === 'skills' ? 'skill' : 'concept'}.done`, { count: draft.value[key].length })
})

function clearAll() {
  draft.value = { skills: [], concepts: [] }
}

function setAuthor(author: string | undefined) {
  const next = copy(draft.value)
  if (author === undefined) delete next.author
  else next.author = author
  draft.value = next
  page.value = 'filters'
}

function apply() {
  emit('apply', copy(draft.value))
  emit('close')
}

const instrumentName = computed(
  () => props.instruments.find((instrument) => instrument.id === draft.value.instrument)?.name ?? null,
)
</script>

<template>
  <OverlayLayer :open="open" :placement="isCompact ? 'none' : 'center'" @close="page === 'filters' ? emit('close') : (page = 'filters')">
    <div
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      class="flex flex-col bg-surface-raised"
      :class="isCompact ? 'fixed inset-0' : 'max-h-[90vh] w-[min(35rem,calc(100vw-2rem))] rounded-xl shadow-level3'"
    >
      <header class="flex min-h-14 shrink-0 items-center gap-2 px-2">
        <button
          v-if="page === 'filters'"
          type="button"
          data-test="filters-close"
          class="inline-flex size-12 items-center justify-center rounded-full text-ink hover:bg-surface-sunken"
          :aria-label="t('authoringFilters.close')"
          @click="emit('close')"
        >
          <X :size="22" aria-hidden="true" />
        </button>
        <button
          v-else
          type="button"
          data-test="filters-back"
          class="inline-flex size-12 items-center justify-center rounded-full text-ink hover:bg-surface-sunken"
          :aria-label="t('sheetHeader.back')"
          @click="page = 'filters'"
        >
          <ArrowLeft :size="22" aria-hidden="true" />
        </button>
        <h2 :id="titleId" data-test="filters-title" class="flex-1 text-lg font-semibold text-ink">{{ title }}</h2>
        <button
          v-if="page === 'filters'"
          type="button"
          data-test="filters-clear-all"
          class="min-h-12 px-3 text-sm font-semibold text-accent-text hover:underline"
          @click="clearAll"
        >
          {{ t('authoringFilters.clearAll') }}
        </button>
      </header>

      <div data-test="filters-body" class="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-4 pt-2">
        <AuthoringFilterFields
          v-if="page === 'filters'"
          v-model="draft"
          :section="section"
          :instruments="instruments"
          :skill-nodes="skillNodes"
          :concept-nodes="conceptNodes"
          :me="me"
          :author-name="authorName"
          @open="page = $event"
        />
        <KnowledgeFilterPicker
          v-else-if="page === 'skills' || page === 'concepts'"
          v-model="draft[page]"
          :kind="page === 'skills' ? 'skill' : 'concept'"
          :nodes="page === 'skills' ? skillNodes : conceptNodes"
          :instrument-id="draft.instrument ?? null"
          :instrument-name="instrumentName"
        />
        <AuthorFilterPicker
          v-else
          :scope="CREATORS_SCOPE[section]"
          :section="section"
          :me="me"
          :model-value="draft.author"
          @update:model-value="setAuthor"
        />
      </div>

      <!-- Fixed below what scrolls, so its action is always in reach. -->
      <footer v-if="page !== 'author'" data-test="filters-footer" class="flex shrink-0 flex-col border-t border-border px-5 pb-safe pt-3">
        <PrimaryButton v-if="page === 'filters'" data-test="filters-show" class="mb-3" @click="apply">{{ showLabel }}</PrimaryButton>
        <PrimaryButton v-else data-test="knowledge-done" class="mb-3" @click="page = 'filters'">{{ doneLabel }}</PrimaryButton>
      </footer>
    </div>
  </OverlayLayer>
</template>
