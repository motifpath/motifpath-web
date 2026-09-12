<script setup lang="ts">
interface RegisteringNoticeProps {
  testId?: string
}

withDefaults(defineProps<RegisteringNoticeProps>(), {
  testId: 'registering',
})
</script>

<template>
  <p :data-test="testId" class="text-ink-muted">Setting up your account…</p>
</template>
