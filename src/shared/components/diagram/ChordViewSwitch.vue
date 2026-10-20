<script setup lang="ts">
/** Box | Neck: shows a chord as a chord box or on the fretboard, in place. */
import { computed } from 'vue'

import SegmentedControl from '@/shared/components/SegmentedControl.vue'
import { isChordView } from '@/shared/composables/useChordView'
import type { ChordView } from '@/shared/composables/useChordView'
import { useTypedT } from '@/shared/composables/useTypedT'

const view = defineModel<ChordView>({ required: true })

const { t } = useTypedT()

const shown = computed({
  get: () => view.value,
  set: (next: string) => {
    if (isChordView(next)) view.value = next
  },
})
const options = computed(() => [
  { value: 'box', label: t('chordView.box') },
  { value: 'neck', label: t('chordView.neck') },
])
</script>

<template>
  <SegmentedControl v-model="shown" class="w-fit" :label="t('chordView.label')" :options="options" test-id-prefix="chord-view" />
</template>
