<script setup lang="ts">
/**
 * A diagram in the Teach grid: its board drawn whole, since a diagram is recognised by its
 * shape, then its name, one meta line and a Template badge on a template. The whole tile opens
 * the diagram's editor.
 */
import type { RouteLocationRaw } from 'vue-router'

import type { components } from '@/api/generated/core-domain'
import DiagramThumbnail from '@/shared/components/diagram/DiagramThumbnail.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

defineProps<{
  diagram: components['schemas']['Diagram']
  instruments: components['schemas']['Instrument'][]
  name: string
  meta: string
  to: RouteLocationRaw
}>()

const { t } = useTypedT()
</script>

<template>
  <RouterLink
    :to="to"
    class="flex h-full flex-col gap-2 rounded-2xl border border-border bg-surface-raised p-2 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
  >
    <DiagramThumbnail :diagram="diagram" :instruments="instruments" />
    <span class="flex min-w-0 flex-col gap-0.5 px-1 pb-1">
      <span data-test="diagram-tile-name" class="line-clamp-2 text-sm font-semibold text-ink">{{ name }}</span>
      <span data-test="diagram-tile-meta" class="truncate text-xs text-ink-muted">{{ meta }}</span>
      <span
        v-if="diagram.kind === 'basic'"
        data-test="template-badge"
        class="mt-1 w-fit rounded-full bg-surface-sunken px-2.5 py-0.5 text-xs font-semibold text-ink-muted"
      >{{ t('diagramListView.templateBadge') }}</span>
    </span>
  </RouterLink>
</template>
