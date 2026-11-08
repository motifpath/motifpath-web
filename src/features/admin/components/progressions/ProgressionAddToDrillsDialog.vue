<script setup lang="ts">
/**
 * Adding a chart-only progression to the drills: what that means for learners, the skills and
 * concepts it will practise, and that there is no way back. When the drills can't take it yet, Add
 * stays disabled and says why. On a phone a sheet with its ×.
 */
import { computed } from 'vue'

import ProgressionDrillFields from '@/features/admin/components/songChartEditor/ProgressionDrillFields.vue'
import type { NotAddableReason } from '@/features/admin/composables/useAddToDrills'
import AppButton from '@/shared/components/AppButton.vue'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import OverlayPanel from '@/shared/components/OverlayPanel.vue'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{
  open: boolean
  name: string
  /** "Major · 4 bars · tagged in 2 charts". */
  meta: string
  /** Why the drills can't take it as it is, before asking the server: minor, or a bar count they don't ask. */
  blocked: 'minor' | 'bars' | null
  /** Why the server refused it. */
  reasons: NotAddableReason[]
  picked: boolean
  adding: boolean
  failed: boolean
}>()
const skillIds = defineModel<string[]>('skillIds', { required: true })
const conceptIds = defineModel<string[]>('conceptIds', { required: true })
const emit = defineEmits<{ close: []; add: [] }>()

const { t } = useTypedT()
const { isCompact } = useSizeClass()

const refusal = computed(() => {
  if (props.blocked === 'minor') return t('progressionList.addToDrills.refused.unsupported_mode')
  if (props.blocked === 'bars') return t('progressionList.addToDrills.refused.unsupported_bar_count')
  return props.reasons.map((reason) => t(`progressionList.addToDrills.refused.${reason}`)).join(' ')
})
</script>

<template>
  <OverlayPanel :open="open" :title="t('progressionList.addToDrills.title', { name })" @close="emit('close')">
    <div data-test="add-to-drills-dialog" class="flex flex-col gap-4 text-base text-ink">
      <p class="text-sm text-ink-muted">{{ t('progressionList.addToDrills.explain', { meta }) }}</p>
      <ProgressionDrillFields v-model:skill-ids="skillIds" v-model:concept-ids="conceptIds" />
      <p class="text-xs text-ink-muted">{{ t('progressionList.addToDrills.noWayBack') }}</p>
      <InlineNotice v-if="refusal" data-test="add-to-drills-refusal" :message="refusal" />
      <InlineNotice v-else-if="failed" data-test="add-to-drills-error" :message="t('progressionList.addToDrills.failed')" />
    </div>
    <template #actions>
      <AppButton v-if="!isCompact" data-test="add-to-drills-cancel" variant="tertiary" @click="emit('close')">
        {{ t('progressionList.remove.cancel') }}
      </AppButton>
      <AppButton data-test="add-to-drills-confirm" :block="isCompact" :disabled="!picked || blocked !== null" :busy="adding" @click="emit('add')">
        {{ t('progressionList.addToDrills.action') }}
      </AppButton>
      <AppButton v-if="isCompact" data-test="add-to-drills-cancel" variant="tertiary" block @click="emit('close')">
        {{ t('progressionList.remove.cancel') }}
      </AppButton>
    </template>
  </OverlayPanel>
</template>
