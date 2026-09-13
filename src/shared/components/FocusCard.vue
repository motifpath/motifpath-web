<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

import PrimaryButton from '@/shared/components/PrimaryButton.vue'

/**
 * The 7th owned component (PB-35 Phase 2 decision, ADR-018 amendment
 * 2026-09-13): the single, larger card reserved for the current, actionable
 * step in a path. Every other step renders as a plain `StepRow` card
 * (Direction B); this is Direction D's one genuinely new piece.
 */
defineProps<{
  position: number | string
  eyebrow: string
  title: string
  subtitle: string
  ctaLabel: string
  to: RouteLocationRaw
}>()
</script>

<template>
  <li data-variant="focus" class="rounded-lg border border-accent bg-surface-raised p-4">
    <span data-test="step-position" class="sr-only">{{ position }}</span>
    <p class="mb-1.5 text-xs font-bold uppercase tracking-wide text-accent-text">
      {{ eyebrow }}
    </p>
    <p class="mb-1 text-base font-extrabold text-ink">{{ title }}</p>
    <p class="mb-3 text-sm text-ink-muted">{{ subtitle }}</p>
    <PrimaryButton as="RouterLink" :to="to">{{ ctaLabel }}</PrimaryButton>
  </li>
</template>
