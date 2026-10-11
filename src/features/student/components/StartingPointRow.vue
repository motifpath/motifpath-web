<script setup lang="ts">
/**
 * One path or course on Where to start: what it is, at which level and in which language, its title
 * and size. The whole row opens its detail.
 */
import { ChevronRight } from 'lucide-vue-next'
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import type { StartingPointItem } from '@/features/student/composables/useStartingPoints'
import { i18n } from '@/i18n'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{ item: StartingPointItem; to: RouteLocationRaw }>()

const { t } = useTypedT()

// The language named in the reader's own language, capitalised as a label ("Português (Brasil)").
const languageName = computed(() => {
  const name = new Intl.DisplayNames([i18n.global.locale.value], { type: 'language' }).of(props.item.language.replace('_', '-'))
  return name ? name.charAt(0).toLocaleUpperCase(i18n.global.locale.value) + name.slice(1) : props.item.language
})

const eyebrow = computed(() =>
  [t(`firstRun.kinds.${props.item.kind}`), t(`levels.${props.item.level}`), languageName.value].join(' · '),
)
</script>

<template>
  <RouterLink
    :to="to"
    data-test="starting-point"
    class="flex min-h-12 items-center gap-3 rounded-lg border border-border bg-surface-raised p-4 hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
  >
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <p data-test="starting-point-eyebrow" class="text-xs font-semibold uppercase tracking-wide text-accent-text">{{ eyebrow }}</p>
      <h3 class="text-base font-semibold text-ink">{{ item.title }}</h3>
      <p v-if="item.lessonCount !== undefined" class="text-sm text-ink-muted">{{ t('firstRun.lessons', { count: item.lessonCount }) }}</p>
    </div>
    <ChevronRight :size="20" class="shrink-0 text-ink-subtle" aria-hidden="true" />
  </RouterLink>
</template>
