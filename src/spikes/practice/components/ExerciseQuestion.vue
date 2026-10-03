<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { exercises } from '@/spikes/practice/fixtures/catalog'
import type { ExerciseItem, PracticeResponse } from '@/spikes/practice/model'

const props = defineProps<{ item: ExerciseItem }>()
const emit = defineEmits<{ answered: [response: PracticeResponse] }>()

const exercise = computed(() => exercises.find((e) => e.exercise_id === props.item.exercise_id))
const shownAt = ref(0)
onMounted(() => {
  shownAt.value = performance.now()
})
const picked = ref<string | null>(null)

function pick(id: string, correct: boolean) {
  if (picked.value) return
  picked.value = id
  const latency_ms = Math.round(performance.now() - shownAt.value)
  setTimeout(() => emit('answered', { kind: 'option_choice', option_id: id, latency_ms }), correct ? 500 : 1400)
}
</script>

<template>
  <div v-if="exercise" class="flex flex-col gap-4">
    <p class="text-lg font-semibold">{{ exercise.prompt }}</p>
    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="o in exercise.options"
        :key="o.id"
        type="button"
        class="rounded-lg border border-border p-3 text-lg"
        :class="{ 'bg-success-muted': picked && o.correct, 'bg-danger-muted': picked === o.id && !o.correct }"
        @click="pick(o.id, o.correct)"
      >
        {{ o.text }}
      </button>
    </div>
  </div>
</template>
