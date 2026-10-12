<script setup lang="ts">
/**
 * A notice in place of what failed or can't be shown, never a dialog. An error failed and may work
 * on a retry, and is announced as an alert; something unavailable won't work here, so the student
 * moves on, and it is announced politely. Each tone has its own icon, so neither relies on colour;
 * `icon` replaces it when a more specific one says what is missing, such as a larger screen.
 */
import { CircleAlert, TriangleAlert } from 'lucide-vue-next'
import type { Component } from 'vue'

withDefaults(defineProps<{ message: string; tone?: 'error' | 'unavailable'; icon?: Component }>(), { tone: 'error', icon: undefined })
</script>

<template>
  <div
    data-test="inline-notice"
    :data-tone="tone"
    :role="tone === 'error' ? 'alert' : 'status'"
    class="flex items-start gap-2.5 rounded-md px-4 py-3 text-sm"
    :class="tone === 'error' ? 'bg-danger-muted text-danger' : 'bg-warning-muted text-ink'"
  >
    <component :is="icon" v-if="icon" :size="18" class="mt-0.5 shrink-0" :class="tone === 'error' ? '' : 'text-warning'" aria-hidden="true" />
    <TriangleAlert v-else-if="tone === 'error'" :size="18" class="mt-0.5 shrink-0" aria-hidden="true" />
    <CircleAlert v-else :size="18" class="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
    <span>{{ message }}</span>
  </div>
</template>
