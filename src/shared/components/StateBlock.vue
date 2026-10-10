<script setup lang="ts">
import { Inbox, Languages, Lock, SearchX, WifiOff } from 'lucide-vue-next'
import { computed } from 'vue'

export type StateKind = 'empty' | 'locked' | 'notFound' | 'offline' | 'language'

const props = defineProps<{
  /**
   * Nothing there yet · not yet allowed · gone or not yours · offline with nothing cached · not in
   * the student's language, but in another one they can choose.
   */
  kind: StateKind
  /** Specific to the page ("No courses yet"), never "No data". */
  title: string
  /** One sentence: why, and for a locked state, what opens it. */
  message: string
}>()

const ICONS = { empty: Inbox, locked: Lock, notFound: SearchX, offline: WifiOff, language: Languages }
const icon = computed(() => ICONS[props.kind])
</script>

<template>
  <div class="flex flex-col items-center gap-3 px-4 py-10 text-center">
    <span data-test="state-icon" class="flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken text-ink-muted">
      <component :is="icon" :size="22" aria-hidden="true" />
    </span>
    <h2 class="text-lg font-semibold text-ink">{{ title }}</h2>
    <p class="max-w-sm text-sm text-ink-muted">{{ message }}</p>
    <!-- At most one way forward: the action that fills, unlocks or leaves this state. -->
    <div v-if="$slots.action" class="mt-2 flex w-full max-w-sm flex-col items-stretch">
      <slot name="action" />
    </div>
  </div>
</template>
