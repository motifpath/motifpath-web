<script setup lang="ts">
import PrimaryButton from '@/shared/components/PrimaryButton.vue'

defineProps<{ message: string }>()
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="flex flex-col items-start gap-3">
    <p class="text-ink-muted">{{ message }}</p>
    <PrimaryButton data-test="retry" @click="emit('retry')">Try again</PrimaryButton>
  </div>
</template>
