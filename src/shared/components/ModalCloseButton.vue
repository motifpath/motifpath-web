<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { useTypedT } from '@/shared/composables/useTypedT'

defineEmits<{ close: [] }>()

const { t } = useTypedT()
</script>

<template>
  <button
    type="button"
    data-test="close-modal"
    :aria-label="t('modalCloseButton.ariaLabel')"
    class="flex h-[30px] w-[30px] items-center justify-center rounded-sm bg-surface-sunken text-ink-muted"
    @click="$emit('close')"
  >
    <X :size="14" aria-hidden="true" />
  </button>
</template>
