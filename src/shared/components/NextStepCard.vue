<script setup lang="ts">
/**
 * The one thing to do next in a sequence: what kind of step it is, where it sits, its title, and
 * the single action that opens it. It is the screen's primary action, so a screen shows at most one.
 */
import type { RouteLocationRaw } from 'vue-router'

import Icon from '@/shared/components/Icon.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'

defineProps<{
  /** Where the step sits, e.g. "Up next · step 8 of 14". */
  eyebrow: string
  title: string
  kind: 'video' | 'article'
  kindLabel: string
  actionLabel: string
  to: RouteLocationRaw
}>()
</script>

<template>
  <section data-test="next-step-card" class="flex flex-col gap-4 rounded-xl border border-border bg-surface-raised p-4">
    <div class="flex items-start gap-3">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-muted text-accent-text">
        <Icon :name="kind" :size="22" />
      </span>
      <div class="flex min-w-0 flex-col">
        <p data-test="next-step-eyebrow" class="text-xs font-semibold uppercase tracking-wide text-accent-text">{{ eyebrow }}</p>
        <h2 class="text-base font-semibold text-ink">{{ title }}</h2>
        <p class="text-xs text-ink-muted">{{ kindLabel }}</p>
      </div>
    </div>
    <PrimaryButton as="RouterLink" :to="to" data-test="next-step-action" class="w-full">{{ actionLabel }}</PrimaryButton>
  </section>
</template>
