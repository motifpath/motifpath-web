<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next'

defineProps<{ message: string }>()
</script>

<template>
  <div data-test="inline-notice" role="alert" class="flex items-start gap-2.5 rounded-md bg-danger-muted px-4 py-3 text-sm text-danger">
    <TriangleAlert :size="18" class="mt-0.5 shrink-0" aria-hidden="true" />
    <span>{{ message }}</span>
  </div>
</template>
