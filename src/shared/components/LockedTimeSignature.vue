<script setup lang="ts">
/**
 * The time signature of a metronome that plays content, which the content sets: shown with a lock
 * and why it can't be changed here, so the student knows the bar is not theirs to pick.
 */
import { Lock } from 'lucide-vue-next'

import type { components } from '@/api/generated/core-domain'
import { useTypedT } from '@/shared/composables/useTypedT'

type TimeSignature = components['schemas']['TimeSignature']

defineProps<{
  signature: TimeSignature
  /** A diagram's own bar, or a progression's 4/4 of one chord a bar. */
  setBy: 'diagram' | 'progression'
}>()

const { t } = useTypedT()
</script>

<template>
  <p data-test="locked-time-signature" class="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
    <Lock :size="16" aria-hidden="true" />
    {{
      setBy === 'diagram'
        ? t('lockedTimeSignature.diagram', { signature: `${signature.beats}/${signature.beat_value}` })
        : t('lockedTimeSignature.progression', { signature: `${signature.beats}/${signature.beat_value}` })
    }}
  </p>
</template>
