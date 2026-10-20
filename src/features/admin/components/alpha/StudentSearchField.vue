<script setup lang="ts">
/**
 * Picks one student of the alpha by name, out of however many there are. The search keeps a fixed
 * width, and the picked student shows as a removable chip after it, so a long or short name never
 * moves the search. "All students" clears the pick.
 */
import { Search } from 'lucide-vue-next'
import { computed, ref, useId } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useAlphaStudentSearch } from '@/features/admin/composables/useAlphaObservation'
import FilterChip from '@/shared/components/FilterChip.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

type UserRef = components['schemas']['UserRef']

defineProps<{ modelValue: UserRef | null }>()
const emit = defineEmits<{ 'update:modelValue': [student: UserRef | null] }>()

const { t } = useTypedT()
const { students, nameQuery, isLoading, error, retry } = useAlphaStudentSearch()

const id = useId()
const listboxId = `${id}-listbox`
const statusId = `${id}-status`
const optionId = (index: number) => `${id}-option-${index}`

const isOpen = ref(false)
const highlighted = ref(-1)

/** "All students" first, then the matches; null stands for "All students". */
const choices = computed<(UserRef | null)[]>(() => [null, ...students.value])

/** What the open list shows instead of matches, if anything. */
const status = computed<'loading' | 'failed' | 'empty' | null>(() => {
  if (isLoading.value && students.value.length === 0) return 'loading'
  if (error.value) return 'failed'
  if (students.value.length === 0) return 'empty'
  return null
})

function open() {
  if (isOpen.value) return
  highlighted.value = -1
  isOpen.value = true
}

function close() {
  isOpen.value = false
  highlighted.value = -1
}

function onInput(event: Event) {
  open()
  if (event.target instanceof HTMLInputElement) nameQuery.value = event.target.value
  highlighted.value = -1
}

function pick(student: UserRef | null) {
  emit('update:modelValue', student)
  nameQuery.value = ''
  close()
}

function onKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      open()
      highlighted.value = Math.min(highlighted.value + 1, choices.value.length - 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      highlighted.value = Math.max(highlighted.value - 1, 0)
      break
    case 'Enter':
      if (isOpen.value && highlighted.value >= 0) {
        event.preventDefault()
        pick(choices.value[highlighted.value] ?? null)
      }
      break
    case 'Escape':
      close()
      break
  }
}
</script>

<template>
  <div data-test="student-search" class="flex flex-wrap items-center gap-2">
    <div class="relative w-80 max-w-full">
      <label :for="id" class="sr-only">{{ t('engagement.studentSearch.label') }}</label>
      <Search :size="18" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
      <input
        :id="id"
        type="text"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        :aria-expanded="isOpen"
        :aria-controls="listboxId"
        :aria-describedby="isOpen && status ? statusId : undefined"
        :aria-activedescendant="isOpen && highlighted >= 0 ? optionId(highlighted) : undefined"
        :value="nameQuery"
        :placeholder="t('engagement.studentSearch.placeholder')"
        class="h-12 w-full rounded-full border border-border bg-surface-sunken pl-10 pr-4 text-sm text-ink placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        @focus="open"
        @click="open"
        @blur="close"
        @input="onInput"
        @keydown="onKeydown"
      />
      <div
        v-if="isOpen"
        class="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface-raised shadow-level1"
      >
        <ul :id="listboxId" role="listbox" :aria-label="t('engagement.studentSearch.label')" class="max-h-72 overflow-y-auto py-1">
          <li
            v-for="(choice, index) in choices"
            :id="optionId(index)"
            :key="choice?.user_id ?? 'all'"
            role="option"
            :aria-selected="(choice?.user_id ?? null) === (modelValue?.user_id ?? null)"
            class="cursor-pointer px-4 py-2.5 text-sm"
            :class="index === highlighted ? 'bg-accent-muted text-accent-text' : 'text-ink'"
            @mousedown.prevent="pick(choice)"
            @mouseenter="highlighted = index"
          >
            {{ choice?.display_name ?? t('engagement.events.allStudents') }}
          </li>
        </ul>
        <!-- A listbox holds only options: loading, a failure and no matches are a status line after it. -->
        <p v-if="status" :id="statusId" role="status" class="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-sm text-ink-muted">
          <template v-if="status === 'loading'">{{ t('engagement.studentSearch.loading') }}</template>
          <template v-else-if="status === 'failed'">
            {{ t('engagement.studentSearch.failed') }}
            <button
              type="button"
              data-test="student-search-retry"
              class="font-semibold text-accent-text underline"
              @mousedown.prevent="retry"
            >
              {{ t('buttons.tryAgain') }}
            </button>
          </template>
          <template v-else>{{ t('engagement.noMatches') }}</template>
        </p>
      </div>
    </div>
    <FilterChip v-if="modelValue" :label="modelValue.display_name" @remove="pick(null)" />
  </div>
</template>
