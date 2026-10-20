<script setup lang="ts">
/**
 * Chooses the one teacher Discover shows the work of: Any teacher first, then every teacher of the
 * segment's catalog, found by name. Choosing hands back the teacher with their name, so the filters
 * can name them before the list is applied.
 */
import { Check, UserRound } from 'lucide-vue-next'
import { computed } from 'vue'

import SearchField from '@/shared/components/SearchField.vue'
import { useCourseCreators } from '@/shared/composables/useCourseCreators'
import { useTypedT } from '@/shared/composables/useTypedT'

export interface ChosenTeacher {
  user_id: string
  display_name: string
}

const props = defineProps<{
  /** Whose teachers: the course catalog's or the path catalog's. */
  scope: 'catalog' | 'path-catalog'
  /** The chosen teacher's user id. */
  modelValue: string | undefined
}>()
const emit = defineEmits<{ choose: [teacher: ChosenTeacher | null] }>()

const { t } = useTypedT()
const { creators, nameQuery, isLoading, error, retry } = useCourseCreators(props.scope)

const options = computed(() => [
  { id: undefined, label: t('teacherFilterPicker.anyTeacher') },
  ...creators.value.map((creator) => ({ id: creator.user_id, label: creator.display_name })),
])

function choose(option: { id: string | undefined; label: string }) {
  emit('choose', option.id === undefined ? null : { user_id: option.id, display_name: option.label })
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <SearchField v-model="nameQuery" :placeholder="t('teacherFilterPicker.searchPlaceholder')" />

    <div role="radiogroup" :aria-label="t('teacherFilterPicker.label')" class="flex flex-col">
      <button
        v-for="option in options"
        :key="option.id ?? 'any'"
        type="button"
        role="radio"
        data-test="teacher-option"
        :aria-checked="option.id === modelValue ? 'true' : 'false'"
        class="flex min-h-14 items-center gap-3 text-left hover:bg-surface-sunken focus-visible:bg-surface-sunken focus-visible:outline-none"
        @click="choose(option)"
      >
        <Check v-if="option.id === modelValue" :size="20" class="shrink-0 text-accent-text" aria-hidden="true" />
        <UserRound v-else :size="20" class="shrink-0 text-ink-muted" aria-hidden="true" />
        <span class="min-w-0 flex-1 truncate text-base text-ink">{{ option.label }}</span>
      </button>
    </div>

    <p v-if="isLoading && creators.length === 0" role="status" class="text-sm text-ink-muted">
      {{ t('teacherFilterPicker.loading') }}
    </p>
    <p v-else-if="error" role="status" class="flex items-center gap-2 text-sm text-ink-muted">
      {{ t('teacherFilterPicker.errorMessage') }}
      <button type="button" data-test="teacher-retry" class="font-semibold text-accent-text underline" @click="retry">
        {{ t('teacherFilterPicker.retry') }}
      </button>
    </p>
    <p v-else-if="nameQuery.trim() && creators.length === 0" class="text-sm text-ink-muted">
      {{ t('teacherFilterPicker.noMatches') }}
    </p>
  </div>
</template>
