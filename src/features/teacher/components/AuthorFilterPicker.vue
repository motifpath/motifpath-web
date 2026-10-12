<script setup lang="ts">
/**
 * Chooses whose items a Teach list shows: Anyone, then Me, then every author of the section
 * found by name, each with how many items they have in it. One author at a time.
 */
import { Check, UserRound } from 'lucide-vue-next'
import { computed } from 'vue'

import type { AuthoringSection } from '@/features/teacher/utils/authoringListQuery'
import SearchField from '@/shared/components/SearchField.vue'
import { type CourseCreatorsScope, useCourseCreators } from '@/shared/composables/useCourseCreators'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{
  /** Which list's creators to offer. */
  scope: CourseCreatorsScope
  /** Names the items in each author's count. */
  section: AuthoringSection
  me: { user_id: string; display_name: string } | null
}>()
const author = defineModel<string | undefined>({ required: true })

const { t, locale } = useTypedT()
const { creators, nameQuery, isLoading, error, retry } = useCourseCreators(props.scope)

const myCount = computed(() => creators.value.find((creator) => creator.user_id === props.me?.user_id)?.item_count)
const others = computed(() => creators.value.filter((creator) => creator.user_id !== props.me?.user_id))

function countLabel(count: number): string {
  return t(`authoringList.count.${props.section}`, {
    count,
    shown: new Intl.NumberFormat(locale.value).format(count),
  })
}

interface Option {
  id: string | undefined
  label: string
  count: number | undefined
}

const options = computed<Option[]>(() => [
  { id: undefined, label: t('authorFilter.anyone'), count: undefined },
  ...(props.me ? [{ id: props.me.user_id, label: t('authorFilter.me', { name: props.me.display_name }), count: myCount.value }] : []),
  ...others.value.map((creator) => ({ id: creator.user_id, label: creator.display_name, count: creator.item_count })),
])
</script>

<template>
  <div class="flex flex-col gap-3">
    <SearchField v-model="nameQuery" :placeholder="t('authorFilter.search')" />

    <div role="radiogroup" :aria-label="t('authorFilter.title')" class="flex flex-col">
      <button
        v-for="option in options"
        :key="option.id ?? 'anyone'"
        type="button"
        role="radio"
        data-test="author-option"
        :aria-checked="option.id === author ? 'true' : 'false'"
        class="flex min-h-14 items-center gap-3 text-left hover:bg-surface-sunken focus-visible:bg-surface-sunken focus-visible:outline-none"
        @click="author = option.id"
      >
        <Check v-if="option.id === author" :size="20" class="shrink-0 text-accent-text" aria-hidden="true" />
        <UserRound v-else :size="20" class="shrink-0 text-ink-muted" aria-hidden="true" />
        <span class="min-w-0 flex-1 truncate text-base text-ink">{{ option.label }}</span>
        <span v-if="option.count !== undefined" class="shrink-0 text-xs text-ink-muted">{{ countLabel(option.count) }}</span>
      </button>
    </div>

    <p v-if="isLoading && creators.length === 0" role="status" class="text-sm text-ink-muted">{{ t('authorFilter.loading') }}</p>
    <p v-else-if="error" role="status" class="flex items-center gap-2 text-sm text-ink-muted">
      {{ t('authorFilter.loadFailed') }}
      <button type="button" data-test="author-retry" class="font-semibold text-accent-text underline" @click="retry">
        {{ t('authorFilter.retry') }}
      </button>
    </p>
    <p v-else-if="nameQuery.trim() && others.length === 0" class="text-sm text-ink-muted">{{ t('authorFilter.noMatches') }}</p>
  </div>
</template>
