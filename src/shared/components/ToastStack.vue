<script setup lang="ts">
import { CheckCircle2, TriangleAlert, X } from 'lucide-vue-next'
import { useTypedT } from '@/shared/composables/useTypedT'

import { useToast } from '@/shared/composables/useToast'

const { toasts, dismiss, pause, resume, runAction } = useToast()
const { t } = useTypedT()
</script>

<template>
  <!-- position: fixed so a toast stays on screen regardless of the page's
       own scroll position. At the bottom, in the thumb zone, where the
       student's attention already is after acting — above the bottom navigation bar while it
       shows (the shell sets --toast-clearance to the bar's height), else clear of the home
       indicator. -->
  <div
    data-test="toast-region"
    class="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center px-4 pb-[var(--toast-clearance,max(0.75rem,env(safe-area-inset-bottom)))]"
  >
    <div
      v-for="toast in toasts"
      :key="toast.id"
      data-test="toast"
      :role="toast.kind === 'error' ? 'alert' : 'status'"
      class="pointer-events-auto mb-2 flex min-h-12 w-full max-w-[30rem] items-center gap-3 rounded-md bg-ink py-2 pl-4 pr-2 text-surface shadow-level3"
      @mouseenter="pause(toast.id)"
      @mouseleave="resume(toast.id)"
      @focusin="pause(toast.id)"
      @focusout="resume(toast.id)"
    >
      <TriangleAlert v-if="toast.kind === 'error'" :size="18" class="flex-shrink-0" aria-hidden="true" />
      <CheckCircle2 v-else-if="toast.kind === 'success'" :size="18" class="flex-shrink-0" aria-hidden="true" />
      <span data-test="toast-message" class="flex-1 whitespace-pre-line py-1 text-sm">{{ toast.message }}</span>
      <button
        v-if="toast.action"
        type="button"
        data-test="toast-action"
        class="min-h-12 flex-shrink-0 rounded-md px-3 text-sm font-bold text-surface hover:bg-surface/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-surface"
        @click="runAction(toast.id)"
      >
        {{ toast.action.label }}
      </button>
      <button
        v-if="toast.kind === 'error'"
        type="button"
        data-test="toast-dismiss"
        :aria-label="t('toastStack.dismissAriaLabel')"
        class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md opacity-80 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-surface"
        @click="dismiss(toast.id)"
      >
        <X :size="16" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
