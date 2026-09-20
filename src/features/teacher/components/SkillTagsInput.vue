<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = withDefaults(defineProps<{ tags: string[]; suggestions?: string[] }>(), { suggestions: () => [] })
const emit = defineEmits<{ add: [tag: string]; remove: [tag: string]; focus: [] }>()

const { t } = useTypedT()

const draft = ref('')

const trimmedDraft = computed(() => draft.value.trim())

// Matching against skill tags already used on other exercises, so authoring
// doesn't silently fork near-duplicate tags ("chord-recognition" vs. "chord
// recognition") that a teacher would have picked from the list if it had
// been visible.
const matchingSuggestions = computed(() => {
  if (!trimmedDraft.value) return []
  const query = trimmedDraft.value.toLowerCase()
  return props.suggestions.filter((tag) => !props.tags.includes(tag) && tag.toLowerCase().includes(query))
})

const hasExactMatch = computed(() =>
  matchingSuggestions.value.some((tag) => tag.toLowerCase() === trimmedDraft.value.toLowerCase()),
)

function addTag(tag: string) {
  emit('add', tag)
  draft.value = ''
}

function submit() {
  if (!trimmedDraft.value) return
  const exactMatch = matchingSuggestions.value.find(
    (tag) => tag.toLowerCase() === trimmedDraft.value.toLowerCase(),
  )
  addTag(exactMatch ?? trimmedDraft.value)
}
</script>

<template>
  <div class="relative flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface-raised p-2">
    <span
      v-for="tag in tags"
      :key="tag"
      class="flex items-center gap-1.5 rounded-full bg-accent-muted py-[5px] pl-3 pr-1.5 text-[0.8125rem] font-semibold text-accent-text"
    >
      {{ tag }}
      <button
        type="button"
        data-test="tag-remove"
        class="flex h-[18px] w-[18px] items-center justify-center rounded-full text-accent-text"
        :aria-label="t('skillTagsInput.removeTagAriaLabel', { tag })"
        @click="emit('remove', tag)"
      >
        <X :size="11" :stroke-width="2.4" aria-hidden="true" />
      </button>
    </span>
    <input
      v-model="draft"
      type="text"
      :placeholder="t('skillTagsInput.placeholder')"
      class="min-w-[140px] flex-1 border-none bg-transparent px-1 py-1.5 text-sm outline-none"
      @keydown.enter.prevent="submit"
      @focus="emit('focus')"
    />

    <ul
      v-if="trimmedDraft"
      class="absolute left-0 right-0 top-full z-10 mt-1 flex flex-col overflow-hidden rounded-md border border-border bg-surface-raised shadow-level2"
    >
      <li v-for="tag in matchingSuggestions" :key="tag">
        <button
          type="button"
          data-test="tag-suggestion"
          class="w-full px-3 py-2 text-left text-sm hover:bg-surface-sunken"
          @click="addTag(tag)"
        >
          {{ tag }}
        </button>
      </li>
      <li v-if="!hasExactMatch">
        <button
          type="button"
          data-test="tag-create-option"
          class="w-full px-3 py-2 text-left text-sm text-ink-muted hover:bg-surface-sunken"
          @click="addTag(trimmedDraft)"
        >
          {{ t('skillTagsInput.createOption', { tag: trimmedDraft }) }}
        </button>
      </li>
    </ul>
  </div>
</template>
