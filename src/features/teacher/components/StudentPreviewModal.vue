<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { ref } from 'vue'

import type { ExerciseType, ImageOption, Region, TextOption } from '@/features/teacher/composables/useExerciseForm'

defineProps<{
  open: boolean
  prompt: string
  exerciseType: ExerciseType
  imageUrl: string
  textOptions: TextOption[]
  imageOptions: ImageOption[]
  regions: Region[]
}>()
const emit = defineEmits<{ close: [] }>()

const orientation = ref<'portrait' | 'landscape'>('portrait')
</script>

<template>
  <div
    v-if="open"
    data-test="student-preview-modal"
    class="fixed inset-0 z-20 flex items-center justify-center bg-black/45"
    @click="emit('close')"
  >
    <div class="flex max-h-[720px] w-[640px] flex-col overflow-hidden rounded-xl bg-surface-raised shadow-lg" @click.stop>
      <div class="flex items-center justify-between border-b border-border px-5 py-4">
        <span class="text-base font-bold">Student preview</span>
        <div class="flex items-center gap-2.5">
          <div class="flex gap-1 rounded-md bg-surface-sunken p-1">
            <button
              type="button"
              data-test="orientation-portrait"
              class="rounded px-2.5 py-1 text-xs font-semibold"
              :class="orientation === 'portrait' ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
              @click="orientation = 'portrait'"
            >
              Portrait
            </button>
            <button
              type="button"
              data-test="orientation-landscape"
              class="rounded px-2.5 py-1 text-xs font-semibold"
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
            class="flex h-7 w-7 items-center justify-center rounded bg-surface-sunken text-ink-muted"
            @click="emit('close')"
          >
            <X :size="14" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div class="overflow-y-auto p-5">
        <div
          data-test="preview-layout"
          class="flex gap-3.5 rounded-xl border border-border p-4"
          :class="orientation === 'landscape' ? 'flex-row' : 'flex-col'"
        >
          <div class="text-sm font-semibold text-ink" :class="orientation === 'landscape' ? 'flex-[0_0_40%]' : ''">
            {{ prompt }}
          </div>

          <div class="min-w-0 flex-1">
            <div v-if="exerciseType === 'image_recognition'" class="relative overflow-hidden rounded-md border border-border">
              <img :src="imageUrl" alt="" class="block h-28 w-full object-cover" />
              <div
                v-for="region in regions"
                :key="region.id"
                data-test="preview-region"
                class="absolute rounded border-2 border-accent bg-surface-raised/70"
                :style="{
                  left: region.x + '%',
                  top: region.y + '%',
                  width: region.width / 2 + 'px',
                  height: region.height / 2 + 'px',
                  transform: 'translate(-50%, -50%)',
                  borderRadius: region.shape === 'circle' ? '9999px' : undefined,
                }"
              ></div>
            </div>

            <div v-else-if="exerciseType === 'image_choice'" class="grid grid-cols-2 gap-2">
              <div
                v-for="option in imageOptions"
                :key="option.id"
                class="overflow-hidden rounded-md border-2"
                :class="option.correct ? 'border-success' : 'border-border'"
              >
                <img :src="option.imageUrl" alt="" class="h-14 w-full object-cover" />
                <div class="p-1.5 text-xs">{{ option.caption }}</div>
              </div>
            </div>

            <div v-else class="flex flex-col gap-2">
              <div
                v-for="option in textOptions"
                :key="option.id"
                class="flex items-center gap-2 rounded-md border px-2.5 py-2"
                :class="option.correct ? 'border-success bg-success-muted' : 'border-border bg-surface-raised'"
              >
                <span class="h-4 w-4 flex-shrink-0 rounded-full border-2" :class="option.correct ? 'border-success' : 'border-border'"></span>
                <span class="text-sm">{{ option.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
