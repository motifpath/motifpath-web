<script setup lang="ts">
/**
 * What to practise: the student picks one skill or concept to make a session of. Their path's
 * subjects come first, with their level only; then each area to explore, which opens its subjects.
 * Search finds a subject in any area by its name. A tap picks it. Every subject listed has
 * something to practise with the instrument chosen, so none is a dead end.
 */
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { pathSubjects, searchSubjects } from '@/features/student/utils/practiceSubjects'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import SearchField from '@/shared/components/SearchField.vue'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

type Subject = components['schemas']['PracticeSubject']
type SubjectList = components['schemas']['PracticeSubjectList']
type SubjectGroup = components['schemas']['PracticeSubjectGroup']

const props = defineProps<{
  list: SubjectList | null
  isLoading: boolean
  error: boolean
}>()

const emit = defineEmits<{ pick: [subject: Subject]; retry: [] }>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()

const text = ref('')
const area = ref<SubjectGroup | null>(null)

const fromPath = computed(() => (props.list ? pathSubjects(props.list) : []))
const found = computed(() => (props.list ? searchSubjects(props.list, text.value, (subject) => localizedName(subject.names)) : []))
const searching = computed(() => text.value.trim() !== '')

function levelOf(subject: Subject): string | null {
  return subject.level ? t(`practiceHomeView.levels.${subject.level}`) : null
}

/** Inside an area, a path subject says so; a wide subject has no level of its own. */
function areaDetail(subject: Subject): string | null {
  const level = levelOf(subject)
  if (!subject.on_path) return level
  return level ? t('subjectPicker.onYourPath', { level }) : t('subjectPicker.onYourPathOnly')
}

const ROW =
  'flex min-h-16 w-full items-center gap-3 rounded-lg border border-border bg-surface-raised px-4 py-3 text-left hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus'
const HEADING = 'text-xs font-semibold uppercase tracking-wide text-ink-subtle'
</script>

<template>
  <section class="flex flex-col gap-5" data-test="subject-picker">
    <template v-if="area">
      <button type="button" data-test="picker-back" class="inline-flex min-h-12 items-center gap-1 self-start text-sm font-semibold text-accent-text" @click="area = null">
        <ChevronLeft :size="16" aria-hidden="true" />
        {{ t('subjectPicker.back') }}
      </button>
      <h1 class="text-xl font-semibold">{{ localizedName(area.names) }}</h1>
      <ul class="flex flex-col gap-2">
        <li v-for="subject in area.subjects" :key="subject.node_id">
          <button type="button" data-test="area-subject" :class="ROW" @click="emit('pick', subject)">
            <span class="flex min-w-0 flex-1 flex-col">
              <span data-test="subject-name" class="font-medium text-ink">{{ localizedName(subject.names) }}</span>
              <span v-if="areaDetail(subject)" data-test="subject-detail" class="text-xs text-ink-muted">{{ areaDetail(subject) }}</span>
            </span>
            <ChevronRight :size="20" class="shrink-0 text-ink-muted" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </template>

    <template v-else>
      <header class="flex flex-col gap-1">
        <h1 class="text-xl font-semibold">{{ t('subjectPicker.title') }}</h1>
        <p class="text-sm text-ink-muted">{{ t('subjectPicker.question') }}</p>
      </header>

      <SearchField v-model="text" :placeholder="t('subjectPicker.search')" />

      <LoadingSkeleton v-if="isLoading" :count="4" />
      <LoadFailed v-else-if="error" :message="t('subjectPicker.error')" @retry="emit('retry')" />

      <template v-else-if="list && searching">
        <ul v-if="found.length > 0" class="flex flex-col gap-2">
          <li v-for="subject in found" :key="subject.node_id">
            <button type="button" data-test="found-subject" :class="ROW" @click="emit('pick', subject)">
              <span class="flex min-w-0 flex-1 flex-col">
                <span data-test="subject-name" class="font-medium text-ink">{{ localizedName(subject.names) }}</span>
                <span v-if="areaDetail(subject)" data-test="subject-detail" class="text-xs text-ink-muted">{{ areaDetail(subject) }}</span>
              </span>
              <ChevronRight :size="20" class="shrink-0 text-ink-muted" aria-hidden="true" />
            </button>
          </li>
        </ul>
        <p v-else data-test="no-match" class="text-sm text-ink-muted">{{ t('subjectPicker.noMatch', { text: text.trim() }) }}</p>
      </template>

      <p v-else-if="list && list.groups.length === 0" data-test="no-subjects" class="text-sm text-ink-muted">{{ t('subjectPicker.noSubjects') }}</p>

      <template v-else-if="list">
        <section v-if="fromPath.length > 0" class="flex flex-col gap-2">
          <h2 :class="HEADING">{{ t('subjectPicker.fromYourPath') }}</h2>
          <ul class="flex flex-col gap-2">
            <li v-for="subject in fromPath" :key="subject.node_id">
              <button type="button" data-test="path-subject" :class="ROW" @click="emit('pick', subject)">
                <span class="flex min-w-0 flex-1 flex-col">
                  <span data-test="subject-name" class="font-medium text-ink">{{ localizedName(subject.names) }}</span>
                  <span v-if="levelOf(subject)" data-test="subject-detail" class="text-xs text-ink-muted">{{ levelOf(subject) }}</span>
                </span>
                <ChevronRight :size="20" class="shrink-0 text-ink-muted" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </section>

        <section class="flex flex-col gap-2">
          <h2 :class="HEADING">{{ t('subjectPicker.moreToExplore') }}</h2>
          <ul class="flex flex-col gap-2">
            <li v-for="group in list.groups" :key="group.area_node_id">
              <button type="button" data-test="subject-area" :class="[ROW, 'min-h-14 font-medium text-ink']" @click="area = group">
                <span class="min-w-0 flex-1">{{ localizedName(group.names) }}</span>
                <ChevronRight :size="20" class="shrink-0 text-ink-muted" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </section>
      </template>
    </template>
  </section>
</template>
