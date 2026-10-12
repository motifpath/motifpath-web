<script setup lang="ts">
/**
 * The end of a long list: when it comes into view and more items remain, it asks for the next
 * page. While a page loads it says so; when one failed it offers Try again in place and waits
 * for it, so a failing page is not asked for over and over.
 */
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'

import { useTypedT } from '@/shared/composables/useTypedT'

const props = withDefaults(defineProps<{ hasMore: boolean; loading?: boolean; failed?: boolean }>(), {
  loading: false,
  failed: false,
})
const emit = defineEmits<{ load: [] }>()

const { t } = useTypedT()
const sentinel = useTemplateRef<HTMLElement>('sentinel')
const inView = ref(false)
let observer: IntersectionObserver | null = null

function askIfReady() {
  if (inView.value && props.hasMore && !props.loading && !props.failed) emit('load')
}

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    inView.value = entries.some((entry) => entry.isIntersecting)
    askIfReady()
  })
  if (sentinel.value) observer.observe(sentinel.value)
})
onBeforeUnmount(() => observer?.disconnect())

// A short page can leave the end in view; keep going until it leaves or nothing remains.
watch(() => props.loading, (loading) => {
  if (!loading) askIfReady()
})
</script>

<template>
  <div class="flex flex-col items-center gap-2 py-4">
    <div ref="sentinel" class="h-px w-full" aria-hidden="true" />
    <p v-if="loading" data-test="list-end-loading" role="status" class="text-sm text-ink-subtle">
      {{ t('listEnd.loading') }}
    </p>
    <template v-else-if="failed">
      <p class="text-sm text-ink-muted">{{ t('listEnd.failed') }}</p>
      <button
        type="button"
        data-test="list-end-retry"
        class="rounded-md border border-border bg-surface-raised px-4 py-2 text-sm font-semibold text-ink"
        @click="emit('load')"
      >
        {{ t('listEnd.retry') }}
      </button>
    </template>
  </div>
</template>
