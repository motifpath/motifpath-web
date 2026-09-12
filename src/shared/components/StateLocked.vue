<script setup lang="ts">
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
</script>

<template>
  <div class="flex flex-col items-start gap-3">
    <p class="text-ink-muted">Complete the previous step to unlock this lesson.</p>
    <PrimaryButton as="RouterLink" :to="{ name: 'path' }">Back to path</PrimaryButton>
  </div>
</template>
