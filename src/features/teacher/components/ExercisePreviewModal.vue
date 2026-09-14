<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import ExerciseView from '@/shared/components/ExerciseView.vue'
import type { components } from '@/api/generated/core-domain'

type ExerciseType = components['schemas']['Exercise']['exercise_type']
type Option = components['schemas']['Option']

defineProps<{
  open: boolean
  prompt: string
  exerciseType: ExerciseType
  options: Option[]
}>()
const emit = defineEmits<{ close: [] }>()

const orientation = ref<'portrait' | 'landscape'>('portrait')
const direction = computed(() => (orientation.value === 'landscape' ? 'row' : 'column'))
</script>

<template>
  <div
    v-if="open"
    data-test="preview-modal"
    class="fixed inset-0 z-20 flex items-center justify-center bg-brand-ground/45"
    @click="emit('close')"
  >
    <div
      class="flex max-h-[720px] w-[640px] flex-col overflow-hidden rounded-xl bg-surface-raised shadow-level2"
      @click.stop
    >
      <div class="flex items-center justify-between border-b border-border px-5 py-[18px]">
        <span class="text-base font-bold text-ink">Student preview</span>
        <div class="flex items-center gap-2.5">
          <div class="flex gap-1 rounded-md bg-surface-sunken p-[3px]">
            <button
              type="button"
              data-test="preview-portrait"
              class="rounded-sm px-[9px] py-1 text-[11px] font-semibold"
              :class="orientation === 'portrait' ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
              @click="orientation = 'portrait'"
            >
              Portrait
            </button>
            <button
              type="button"
              data-test="preview-landscape"
              class="rounded-sm px-[9px] py-1 text-[11px] font-semibold"
              :class="orientation === 'landscape' ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
              @click="orientation = 'landscape'"
            >
              Landscape
            </button>
          </div>
          <button
            type="button"
            data-test="close-preview"
            aria-label="Close"
            class="flex h-[30px] w-[30px] items-center justify-center rounded-sm bg-surface-sunken text-ink-muted"
            @click="emit('close')"
          >
            <X :size="14" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div class="overflow-y-auto p-5">
        <span class="text-xs text-ink-subtle">
          Responsive — portrait stacks, landscape puts the prompt beside the answer. This is the
          exact same component the student's Practice screen mounts — not a redrawn copy — so
          what you see here is what they see, ungraded (it never receives which option is marked
          correct).
        </span>
        <div class="mt-3 h-[260px] rounded-xl border border-border bg-surface p-[18px]">
          <ExerciseView :prompt="prompt" :exercise-type="exerciseType" :options="options" :direction="direction" />
        </div>
      </div>
    </div>
  </div>
</template>
