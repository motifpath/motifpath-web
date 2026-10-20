<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'

import AppButton from '@/shared/components/AppButton.vue'
import OverlayPanel from '@/shared/components/OverlayPanel.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

/** The address of a link in rich text: a sheet on a phone, a dialog on anything wider. */
const props = defineProps<{
  open: boolean
  /** The address of the link the selection already has; empty when it has none. */
  href: string
}>()
const emit = defineEmits<{ apply: [href: string]; remove: []; close: [] }>()

const { t } = useTypedT()
const inputId = useId()
const draft = ref(props.href)

watch(
  () => props.open,
  (open) => {
    if (open) draft.value = props.href
  },
)

const address = computed(() => draft.value.trim())

function apply() {
  if (address.value) emit('apply', address.value)
}
</script>

<template>
  <OverlayPanel :open="open" :title="t('promptEditor.link')" @close="emit('close')">
    <form class="flex flex-col gap-2" @submit.prevent="apply">
      <label :for="inputId" class="text-sm font-semibold text-ink">{{ t('promptEditor.linkAddress') }}</label>
      <input
        :id="inputId"
        v-model="draft"
        data-test="prompt-link-address"
        type="url"
        inputmode="url"
        autocomplete="off"
        placeholder="https://"
        class="h-12 rounded-xl border border-border bg-surface-sunken px-3 text-base text-ink"
      />
    </form>
    <template #actions>
      <!-- Remove link beside Apply, as one row at every size. -->
      <div class="flex items-center justify-end gap-2">
        <AppButton v-if="href" data-test="prompt-link-remove" variant="tertiary" @click="emit('remove')">
          {{ t('promptEditor.removeLink') }}
        </AppButton>
        <AppButton data-test="prompt-link-apply" class="min-w-32" :disabled="!address" @click="apply">
          {{ t('promptEditor.applyLink') }}
        </AppButton>
      </div>
    </template>
  </OverlayPanel>
</template>
