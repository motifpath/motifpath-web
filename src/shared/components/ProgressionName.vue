<script setup lang="ts">
/**
 * A progression by its name in the progression catalog, such as I–IV–I–V. The catalog is only
 * asked for once a name is shown.
 */
import { useProgressionNames } from '@/shared/composables/useProgressionNames'

defineProps<{ progressionKey: string }>()

const { nameOf } = useProgressionNames()
</script>

<template>
  <span>{{ nameOf(progressionKey) }}</span>
</template>
