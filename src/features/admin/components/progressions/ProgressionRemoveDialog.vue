<script setup lang="ts">
/**
 * Removing a progression: a confirmation when nothing uses it, or the sections to untag first, with
 * Remove disabled. On a phone a sheet with its × and, once Remove can't go ahead, nothing more to tap.
 */
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { RemovalStep } from '@/features/admin/composables/useProgressionRemoval'
import AppButton from '@/shared/components/AppButton.vue'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import OverlayPanel from '@/shared/components/OverlayPanel.vue'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'

type ProgressionUse = components['schemas']['ProgressionUse']

const props = defineProps<{
  open: boolean
  name: string
  step: RemovalStep
  uses: ProgressionUse[]
  deleting: boolean
  deleteFailed: boolean
}>()
const emit = defineEmits<{ close: []; remove: []; retry: [] }>()

const { t } = useTypedT()
const { isCompact } = useSizeClass()

const refused = computed(() => props.step === 'in_use' || props.step === 'in_drills')
const canGoAhead = computed(() => props.step === 'confirm' || props.step === 'check_failed')

function useLine(use: ProgressionUse): string {
  const where = { chart: use.title, section: use.section_label ?? t('progressionList.remove.section', { number: use.section_index + 1 }) }
  return use.revision === 'draft' ? t('progressionList.remove.useDraft', where) : t('progressionList.remove.usePublished', where)
}

function act() {
  if (props.step === 'check_failed') emit('retry')
  else emit('remove')
}
</script>

<template>
  <OverlayPanel :open="open" :title="t('progressionList.remove.title', { name })" @close="emit('close')">
    <div data-test="remove-dialog" class="flex flex-col gap-3 text-base text-ink">
      <LoadingSkeleton v-if="step === 'checking'" data-test="remove-checking" />
      <template v-else-if="step === 'confirm'">
        <p>{{ t('progressionList.remove.free') }}</p>
        <p>{{ t('progressionList.remove.again') }}</p>
        <InlineNotice v-if="deleteFailed" data-test="remove-error" :message="t('progressionList.remove.failed')" />
      </template>
      <template v-else-if="step === 'in_use'">
        <p>{{ t('progressionList.remove.blocked') }}</p>
        <p class="text-sm font-semibold">{{ t('progressionList.remove.stillTagged') }}</p>
        <ul class="flex list-disc flex-col gap-1 pl-5 text-sm text-ink-muted">
          <li v-for="use in uses" :key="`${use.song_chart_id}-${use.revision}-${use.section_index}`" data-test="remove-use">{{ useLine(use) }}</li>
        </ul>
      </template>
      <p v-else-if="step === 'in_drills'">{{ t('progressionList.remove.inDrills') }}</p>
      <InlineNotice v-else data-test="remove-error" :message="t('progressionList.remove.checkFailed')" />
    </div>
    <template #actions>
      <AppButton v-if="!isCompact" data-test="remove-cancel" variant="tertiary" data-autofocus @click="emit('close')">
        {{ refused ? t('progressionList.remove.close') : t('progressionList.remove.cancel') }}
      </AppButton>
      <AppButton data-test="remove-confirm" variant="destructive" :block="isCompact" :disabled="!canGoAhead" :busy="deleting" @click="act">
        {{ step === 'check_failed' ? t('progressionList.remove.tryAgain') : t('progressionList.remove.action') }}
      </AppButton>
      <AppButton v-if="isCompact && !refused" data-test="remove-cancel" variant="tertiary" block @click="emit('close')">
        {{ t('progressionList.remove.cancel') }}
      </AppButton>
    </template>
  </OverlayPanel>
</template>
