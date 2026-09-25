<script setup lang="ts">
import { useTypedT } from '@/shared/composables/useTypedT'

interface LoadMoreButtonProps {
  loaded: number
  total: number
  loading?: boolean
  failed?: boolean
}

withDefaults(defineProps<LoadMoreButtonProps>(), { loading: false, failed: false })

const emit = defineEmits<{ load: [] }>()

const { t } = useTypedT()
</script>

<template>
  <div v-if="loaded < total" class="flex flex-col items-center gap-2 pt-2">
    <p class="text-sm text-ink-subtle">{{ t('loadMore.showingCount', { loaded, total }) }}</p>
    <p v-if="failed" data-test="load-more-error" class="text-sm text-ink-muted">{{ t('loadMore.failed') }}</p>
    <button
      type="button"
      data-test="load-more"
      :disabled="loading"
      class="rounded-md border border-border bg-surface-raised px-4 py-2 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
      @click="emit('load')"
    >
      {{ t('loadMore.button') }}
    </button>
  </div>
</template>
