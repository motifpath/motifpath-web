<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'

withDefaults(
  defineProps<{
    as?: 'button' | 'RouterLink'
    to?: RouteLocationRaw
    type?: 'button' | 'submit'
  }>(),
  { as: 'button', type: 'button' },
)
</script>

<template>
  <RouterLink
    v-if="as === 'RouterLink'"
    :to="to!"
    class="rounded bg-accent px-4 py-2 text-sm text-accent-fg"
  >
    <slot />
  </RouterLink>
  <button v-else :type="type" class="rounded bg-accent px-4 py-2 text-sm text-accent-fg">
    <slot />
  </button>
</template>
