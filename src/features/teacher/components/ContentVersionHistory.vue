<script setup lang="ts">
import { computed } from 'vue'

import { useTypedT } from '@/shared/composables/useTypedT'
import type { components } from '@/api/generated/core-domain'

type ContentNodeVersion = components['schemas']['ContentNodeVersion']

/**
 * A content node's published versions, newest first as the API returns them.
 * Each row is a summary of what students copied at that point (title,
 * classification, publish time) — not a diff against the draft.
 */
const props = defineProps<{
  versions: ContentNodeVersion[]
  loading: boolean
  error: boolean
  latestVersion: number | null
}>()

defineEmits<{ retry: [] }>()

const { t, locale } = useTypedT()

const dateFormat = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }))

function classificationSummary(version: ContentNodeVersion): string {
  const { skills, concepts } = version.classification_snapshot
  return [...skills.map((s) => s.name), ...concepts.map((c) => c.name)].join(' · ')
}

const isLatest = (version: ContentNodeVersion) => version.version_number === props.latestVersion
</script>

<template>
  <p v-if="error" data-test="versions-error" class="flex items-center gap-2 text-sm text-danger">
    {{ t('contentVersionHistory.loadError') }}
    <button
      type="button"
      data-test="versions-retry"
      class="rounded-md border border-border bg-surface-raised px-2.5 py-1 text-[0.8125rem] font-semibold text-ink"
      @click="$emit('retry')"
    >
      {{ t('buttons.tryAgain') }}
    </button>
  </p>
  <p v-else-if="loading && versions.length === 0" class="text-sm text-ink-subtle">
    {{ t('contentVersionHistory.loading') }}
  </p>
  <p v-else-if="versions.length === 0" data-test="no-versions" class="text-sm text-ink-subtle">
    {{ t('contentVersionHistory.empty') }}
  </p>
  <ol v-else class="flex flex-col gap-2" :aria-label="t('contentVersionHistory.heading')">
    <li
      v-for="version in versions"
      :key="version.version_number"
      data-test="version-row"
      class="flex flex-col gap-1 rounded-md border border-border bg-surface-sunken px-3 py-2.5"
    >
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span class="text-sm font-semibold text-ink">
          {{ t('contentVersionHistory.versionLabel', { version: version.version_number }) }}
        </span>
        <span
          v-if="isLatest(version)"
          class="rounded-full bg-accent-muted px-2 py-0.5 text-[0.75rem] font-semibold text-accent-text"
        >
          {{ t('contentVersionHistory.latestBadge') }}
        </span>
        <time :datetime="version.published_at" class="text-sm text-ink-subtle">
          {{ dateFormat.format(new Date(version.published_at)) }}
        </time>
      </div>
      <span class="text-sm text-ink">{{ version.title_snapshot }}</span>
      <span v-if="classificationSummary(version)" class="text-[0.8125rem] text-ink-muted">
        {{ classificationSummary(version) }}
      </span>
    </li>
  </ol>
</template>
