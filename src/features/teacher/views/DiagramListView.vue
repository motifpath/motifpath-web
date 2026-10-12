<script setup lang="ts">
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import AuthoringList from '@/features/teacher/components/AuthoringList.vue'
import DiagramTile from '@/features/teacher/components/DiagramTile.vue'
import { useAuthoringFilterLabels } from '@/features/teacher/composables/useAuthoringFilterLabels'
import TeachShell from '@/shared/components/TeachShell.vue'
import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'
import { useCurrentUserStore } from '@/stores/currentUser'

type Diagram = components['schemas']['Diagram']

const currentUser = useCurrentUserStore()
const canAuthor = computed(
  () => currentUser.profile?.role === 'teacher' || currentUser.profile?.role === 'admin',
)

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
const { rootLabel } = useAuthoringFilterLabels()
const { instruments } = useListInstruments()

/** The instrument, then the root when the diagram has one: "Guitar · Root A". */
function meta(diagram: Diagram): string {
  const instrument = instruments.value.find((i) => i.instrument_id === diagram.instrument_id)
  return [instrument ? localizedName(instrument.names) : null, diagram.root_note ? rootLabel(diagram.root_note) : null]
    .filter((part): part is string => !!part)
    .join(' · ')
}
</script>

<template>
  <TeachShell section="teacher-diagrams">
    <div class="flex flex-1 flex-col bg-surface">
      <div v-if="!canAuthor" data-test="permission-denied" class="flex flex-1 items-center justify-center p-10">
        <p class="max-w-md text-center text-ink-muted">{{ t('common.permissionDenied') }}</p>
      </div>

      <div v-else class="flex flex-1 flex-col px-4 pb-[80px] pt-6 sm:px-[48px] sm:pt-10">
        <AuthoringList
          section="diagrams"
          grid
          :title="t('diagramListView.heading')"
          :new-label="t('common.newDiagram')"
          :new-to="{ name: 'teacher-diagram-new' }"
          editor-route="teacher-diagram-edit"
          :empty-title="t('diagramListView.emptyHeading')"
          :empty-message="t('diagramListView.emptyMessage')"
          :load-failed-message="t('diagramListView.loadErrorMessage')"
        >
          <template #item="{ item }">
            <DiagramTile
              :diagram="item"
              :instruments="instruments"
              :name="localizedName(item.names)"
              :meta="meta(item)"
              :to="{ name: 'teacher-diagram-edit', params: { id: item.diagram_id } }"
            />
          </template>
        </AuthoringList>
      </div>
    </div>
  </TeachShell>
</template>
