<script setup lang="ts">
import AppButton from '@/shared/components/AppButton.vue'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

defineProps<{ message: string }>()
const emit = defineEmits<{ retry: [] }>()

const { t } = useTypedT()
</script>

<template>
  <!-- A load that failed and may work on a retry: said in place of the content, with the page
       around it left as it is. -->
  <div class="flex flex-col gap-3">
    <InlineNotice :message="message" />
    <AppButton data-test="retry" variant="secondary" block @click="emit('retry')">{{ t('buttons.tryAgain') }}</AppButton>
  </div>
</template>
