<script setup lang="ts">
withDefaults(defineProps<{ message: string; testId?: string }>(), {
  testId: 'error',
})

const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div :data-test="testId" class="flex flex-col items-start gap-3">
    <p class="text-motif-ink/70">{{ message }}</p>
    <button
      type="button"
      data-test="retry"
      class="rounded bg-motif-blue px-4 py-2 text-sm text-motif-blue-fg"
      @click="emit('retry')"
    >
      Try again
    </button>
  </div>
</template>
