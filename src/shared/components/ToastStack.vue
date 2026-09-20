<script setup lang="ts">
import { CheckCircle2, TriangleAlert, X } from 'lucide-vue-next'
import { useTypedT } from '@/shared/composables/useTypedT'

import { useToast } from '@/shared/composables/useToast'

const { toasts, dismiss } = useToast()
const { t } = useTypedT()
</script>

<template>
  <!-- position: fixed so a toast stays on screen regardless of the page's
       own scroll position — the bug this replaces was an inline message
       that could sit below the fold. -->
  <div class="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      data-test="toast"
      :role="toast.kind === 'error' ? 'alert' : 'status'"
      class="pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-md border px-4 py-3 shadow-level3"
      :class="
        toast.kind === 'error'
          ? 'border-danger bg-danger-muted text-danger'
          : 'border-success bg-success-muted text-success'
      "
    >
      <component
        :is="toast.kind === 'error' ? TriangleAlert : CheckCircle2"
        :size="18"
        class="mt-0.5 flex-shrink-0"
        aria-hidden="true"
      />
      <span data-test="toast-message" class="flex-1 whitespace-pre-line text-sm font-semibold">{{
        toast.message
      }}</span>
      <button
        type="button"
        data-test="toast-dismiss"
        :aria-label="t('toastStack.dismissAriaLabel')"
        class="flex-shrink-0 opacity-70 hover:opacity-100"
        @click="dismiss(toast.id)"
      >
        <X :size="16" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
