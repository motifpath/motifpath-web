<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import { ref, watch } from 'vue'

import { useTypedT } from '@/shared/composables/useTypedT'

/**
 * What stops an editor from saving, shown after Save is tapped instead of a disabled Save. Each
 * item jumps to its field: the element marked `data-field="<field>"` in the editor.
 */
const props = withDefaults(
  defineProps<{
    items: { label: string; field: string }[]
    /** Bumped on every Save tapped with something missing: the list scrolls into view again. */
    reveal?: number
  }>(),
  { reveal: 0 },
)

const list = ref<HTMLElement | null>(null)

// After the render, so a list that has only just appeared is there to scroll to.
watch(
  () => props.reveal,
  () => list.value?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }),
  { flush: 'post' },
)

const { t } = useTypedT()

const FOCUSABLE = 'input, textarea, select, button, [contenteditable="true"], [tabindex]:not([tabindex="-1"])'

function jumpTo(field: string) {
  const target = document.querySelector<HTMLElement>(`[data-field="${field}"]`)
  if (!target) return
  target.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
  const control = target.matches(FOCUSABLE) ? target : target.querySelector<HTMLElement>(FOCUSABLE)
  control?.focus({ preventScroll: true })
}
</script>

<template>
  <div
    v-if="items.length"
    ref="list"
    data-test="save-blockers"
    role="alert"
    class="flex flex-col gap-1 rounded-2xl border border-danger bg-danger-muted px-4 py-3 text-sm text-ink"
  >
    <p class="font-semibold text-danger">{{ t('saveBlockers.title') }}</p>
    <ul class="flex flex-col">
      <li v-for="item in items" :key="item.field + item.label">
        <button
          type="button"
          data-test="save-blocker"
          class="flex min-h-10 items-center gap-1 text-left hover:underline"
          @click="jumpTo(item.field)"
        >
          <span>{{ item.label }}</span>
          <ChevronRight :size="14" aria-hidden="true" />
        </button>
      </li>
    </ul>
  </div>
</template>
