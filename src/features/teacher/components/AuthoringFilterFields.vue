<script setup lang="ts">
/**
 * The filters one Teach section takes, in its order, bound to a set of filters. Single choices
 * are chips with Any (Kind's All and Shows' Diagrams are their defaults); the root note is one
 * selector. Skill, Concept and Author open their own page in the `layer` (a phone's or a
 * tablet's filters), summing up the choice; in the `panel` (a computer's side panel) they show
 * in place.
 */
import { BookOpen, Network, UserRound } from 'lucide-vue-next'
import { computed } from 'vue'

import AuthorFilterPicker from '@/features/teacher/components/AuthorFilterPicker.vue'
import KnowledgeFilterPicker from '@/features/teacher/components/KnowledgeFilterPicker.vue'
import {
  type AuthoringListFilters,
  type AuthoringSection,
  CREATORS_SCOPE,
  DIAGRAM_KINDS,
  DIAGRAM_SHOWS,
  type FilterKey,
  LEVELS,
  sectionFilters,
  sectionTypes,
} from '@/features/teacher/utils/authoringListQuery'
import { OFFERED_LANGUAGE_CODES, type MessageKey } from '@/i18n'
import ChoiceChip from '@/shared/components/ChoiceChip.vue'
import MenuRow from '@/shared/components/MenuRow.vue'
import RootNoteSelect from '@/shared/components/RootNoteSelect.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { languageLabelKey } from '@/shared/utils/languageLabels'
import type { TreeNode } from '@/shared/utils/skillConceptTree'

type SingleKey = Exclude<FilterKey, 'skills' | 'concepts' | 'root' | 'author'>
type PageKey = 'skills' | 'concepts' | 'author'

const props = defineProps<{
  section: AuthoringSection
  layout: 'layer' | 'panel'
  instruments: { id: string; name: string }[]
  skillNodes: TreeNode[]
  conceptNodes: TreeNode[]
  me: { user_id: string; display_name: string } | null
  /** The chosen author's name, when it isn't the viewer. */
  authorName: string | null
}>()
const filters = defineModel<AuthoringListFilters>({ required: true })
const emit = defineEmits<{ open: [page: PageKey] }>()

const { t } = useTypedT()


const keys = computed(() => sectionFilters(props.section))

interface Option {
  value: string | undefined
  label: string
}

const TYPE_LABELS: Record<string, MessageKey> = {
  image_recognition: 'common.exerciseTypes.image_recognition',
  image_choice: 'common.exerciseTypes.image_choice',
  audio_recognition: 'common.exerciseTypes.audio_recognition',
  audio_selection: 'common.exerciseTypes.audio_selection',
  text_response: 'common.exerciseTypes.text_response',
  video: 'common.contentTypes.video',
  article: 'common.contentTypes.article',
}

function typeLabel(type: string): string {
  const key = TYPE_LABELS[type]
  return key ? t(key) : type
}

const choices = computed<Record<SingleKey, Option[]>>(() => {
  const any = { value: undefined, label: t('authoringFilters.any') }
  return {
    type: [any, ...sectionTypes(props.section).map((type) => ({ value: type, label: typeLabel(type) }))],
    level: [any, ...LEVELS.map((level) => ({ value: level, label: t(`levels.${level}`) }))],
    instrument: [any, ...props.instruments.map((instrument) => ({ value: instrument.id, label: instrument.name }))],
    kind: [
      { value: undefined, label: t('authoringFilters.kind.all') },
      ...DIAGRAM_KINDS.map((kind) => ({ value: kind, label: t(`authoringFilters.kind.${kind}`) })),
    ],
    shows: [
      { value: undefined, label: t('authoringFilters.shows.diagrams') },
      ...DIAGRAM_SHOWS.map((shows) => ({ value: shows, label: t(`authoringFilters.shows.${shows}`) })),
    ],
    language: [
      any,
      ...OFFERED_LANGUAGE_CODES.map((code) => {
        const key = languageLabelKey(code)
        return { value: code, label: key ? t(key) : code }
      }),
    ],
  }
})

function isSingle(key: FilterKey): key is SingleKey {
  return key in choices.value
}

function setSingle(key: SingleKey, value: string | undefined) {
  const next: AuthoringListFilters = { ...filters.value }
  if (value === undefined) delete next[key]
  else Object.assign(next, { [key]: value })
  filters.value = next
}

function setRoot(root: string | undefined) {
  const next: AuthoringListFilters = { ...filters.value }
  if (root === undefined) delete next.root
  else next.root = root
  filters.value = next
}

function setAuthor(author: string | undefined) {
  const next: AuthoringListFilters = { ...filters.value }
  if (author === undefined) delete next.author
  else next.author = author
  filters.value = next
}

function setKnowledge(key: 'skills' | 'concepts', ids: string[]) {
  filters.value = { ...filters.value, [key]: ids }
}

function knowledgeSummary(key: 'skills' | 'concepts'): string {
  const ids = filters.value[key]
  if (ids.length === 0) return t('authoringFilters.any')
  if (ids.length === 1) {
    const nodes = key === 'skills' ? props.skillNodes : props.conceptNodes
    return nodes.find((node) => node.id === ids[0])?.name ?? t(`knowledgeFilter.${key === 'skills' ? 'skill' : 'concept'}.open`, { count: 1 })
  }
  return t(`knowledgeFilter.${key === 'skills' ? 'skill' : 'concept'}.open`, { count: ids.length })
}

const authorSummary = computed(() => {
  const author = filters.value.author
  if (!author) return t('authoringFilters.any')
  if (author === props.me?.user_id) return t('authoringFilters.me')
  return props.authorName ?? '…'
})

const instrumentName = computed(
  () => props.instruments.find((instrument) => instrument.id === filters.value.instrument)?.name ?? null,
)

const GROUP_HEADING = 'text-xs font-semibold uppercase tracking-wide text-ink-subtle'
</script>

<template>
  <div class="flex flex-col gap-5">
    <template v-for="key in keys" :key="key">
      <fieldset v-if="isSingle(key)" :data-test="`filter-group-${key}`" class="flex flex-col gap-1">
        <legend :class="GROUP_HEADING">{{ t(`authoringFilters.groups.${key}`) }}</legend>
        <div class="flex flex-wrap gap-x-2">
          <ChoiceChip
            v-for="option in choices[key]"
            :key="option.value ?? 'any'"
            :label="option.label"
            :selected="filters[key] === option.value"
            @toggle="setSingle(key, option.value)"
          />
        </div>
      </fieldset>

      <div v-else-if="key === 'root'" data-test="filter-group-root">
        <RootNoteSelect :model-value="filters.root" @update:model-value="setRoot" />
      </div>

      <div v-else-if="key === 'skills' || key === 'concepts'" :data-test="`filter-group-${key}`">
        <MenuRow
          v-if="layout === 'layer'"
          class="-mx-4"
          :label="t(`authoringFilters.groups.${key}`)"
          :icon="key === 'skills' ? Network : BookOpen"
          :value="knowledgeSummary(key)"
          chevron
          @click="emit('open', key)"
        />
        <div v-else class="flex flex-col gap-2">
          <h3 :class="GROUP_HEADING">{{ t(`authoringFilters.groups.${key}`) }}</h3>
          <KnowledgeFilterPicker
            :kind="key === 'skills' ? 'skill' : 'concept'"
            :nodes="key === 'skills' ? skillNodes : conceptNodes"
            :model-value="filters[key]"
            :instrument-id="filters.instrument ?? null"
            :instrument-name="instrumentName"
            layout="inline"
            @update:model-value="setKnowledge(key, $event)"
          />
        </div>
      </div>

      <div v-else-if="key === 'author'" data-test="filter-group-author">
        <MenuRow
          v-if="layout === 'layer'"
          class="-mx-4"
          :label="t('authoringFilters.groups.author')"
          :icon="UserRound"
          :value="authorSummary"
          chevron
          @click="emit('open', 'author')"
        />
        <div v-else class="flex flex-col gap-2">
          <h3 :class="GROUP_HEADING">{{ t('authoringFilters.groups.author') }}</h3>
          <AuthorFilterPicker
            :scope="CREATORS_SCOPE[section]"
            :section="section"
            :me="me"
            :model-value="filters.author"
            @update:model-value="setAuthor"
          />
        </div>
      </div>
    </template>
  </div>
</template>
