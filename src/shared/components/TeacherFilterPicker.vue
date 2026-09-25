<script setup lang="ts">
import { ChevronDown, X } from 'lucide-vue-next'
import { computed, ref, useId } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { type CourseCreatorsScope, useCourseCreators } from '@/shared/composables/useCourseCreators'
import { useTypedT } from '@/shared/composables/useTypedT'

type UserRef = components['schemas']['UserRef']

const props = withDefaults(
  defineProps<{
    modelValue: UserRef | null
    /** Which course list's teachers to offer. */
    scope?: CourseCreatorsScope
  }>(),
  { scope: 'catalog' },
)
const emit = defineEmits<{ 'update:modelValue': [teacher: UserRef | null] }>()

const { t } = useTypedT()
const { creators, nameQuery, isLoading, error, retry } = useCourseCreators(props.scope)

const id = useId()
const listboxId = `${id}-listbox`
const optionId = (index: number) => `${id}-option-${index}`

const isOpen = ref(false)
const highlighted = ref(-1)

// While the list is open the field is a search box; closed, it names the
// teacher currently filtered by, however that teacher was picked.
const inputText = computed(() =>
  isOpen.value ? nameQuery.value : (props.modelValue?.display_name ?? ''),
)

function open() {
  if (isOpen.value) return
  nameQuery.value = ''
  highlighted.value = -1
  isOpen.value = true
}

function close() {
  isOpen.value = false
  highlighted.value = -1
}

function onInput(event: Event) {
  open()
  nameQuery.value = (event.target as HTMLInputElement).value
  highlighted.value = -1
}

function select(teacher: UserRef) {
  emit('update:modelValue', teacher)
  close()
}

function onKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      open()
      highlighted.value = Math.min(highlighted.value + 1, creators.value.length - 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      highlighted.value = Math.max(highlighted.value - 1, 0)
      break
    case 'Enter': {
      const teacher = creators.value[highlighted.value]
      if (isOpen.value && teacher) {
        event.preventDefault()
        select(teacher)
      }
      break
    }
    case 'Escape':
      close()
      break
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <label :for="id" class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
      {{ t('teacherFilterPicker.label') }}
    </label>
    <div class="relative">
      <input
        :id="id"
        data-test="teacher-filter-input"
        type="text"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        :aria-expanded="isOpen"
        :aria-controls="listboxId"
        :aria-activedescendant="highlighted >= 0 ? optionId(highlighted) : undefined"
        :value="inputText"
        :placeholder="
          isOpen ? t('teacherFilterPicker.searchPlaceholder') : t('teacherFilterPicker.anyTeacher')
        "
        class="w-full rounded-md border border-border bg-surface-sunken py-2 pl-3 pr-16 text-sm"
        @focus="open"
        @click="open"
        @blur="close"
        @input="onInput"
        @keydown="onKeydown"
      />
      <div class="absolute inset-y-0 right-2 flex items-center gap-1 text-ink-subtle">
        <button
          v-if="modelValue"
          type="button"
          data-test="teacher-filter-clear"
          class="rounded p-1 hover:text-ink"
          :aria-label="t('teacherFilterPicker.clearAriaLabel')"
          @click="emit('update:modelValue', null)"
        >
          <X :size="14" aria-hidden="true" />
        </button>
        <ChevronDown :size="16" aria-hidden="true" />
      </div>

      <ul
        v-if="isOpen"
        :id="listboxId"
        role="listbox"
        :aria-label="t('teacherFilterPicker.label')"
        class="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-surface-raised py-1 shadow-lg"
      >
        <li v-if="isLoading && creators.length === 0" class="px-3 py-2 text-sm text-ink-muted">
          {{ t('teacherFilterPicker.loading') }}
        </li>
        <li
          v-else-if="error"
          class="flex items-center justify-between gap-2 px-3 py-2 text-sm text-ink-muted"
        >
          {{ t('teacherFilterPicker.errorMessage') }}
          <button
            type="button"
            data-test="teacher-filter-retry"
            class="font-semibold text-accent-text underline"
            @mousedown.prevent="retry"
          >
            {{ t('teacherFilterPicker.retry') }}
          </button>
        </li>
        <li
          v-else-if="creators.length === 0"
          data-test="teacher-filter-no-matches"
          class="px-3 py-2 text-sm text-ink-muted"
        >
          {{ t('teacherFilterPicker.noMatches') }}
        </li>
        <template v-else>
          <li
            v-for="(teacher, index) in creators"
            :id="optionId(index)"
            :key="teacher.user_id"
            role="option"
            :aria-selected="teacher.user_id === modelValue?.user_id"
            class="cursor-pointer px-3 py-2 text-sm"
            :class="[
              index === highlighted ? 'bg-accent-muted text-accent-text' : 'text-ink',
              teacher.user_id === modelValue?.user_id ? 'font-semibold' : '',
            ]"
            @mousedown.prevent="select(teacher)"
            @mouseenter="highlighted = index"
          >
            {{ teacher.display_name }}
          </li>
        </template>
      </ul>
    </div>
  </div>
</template>
