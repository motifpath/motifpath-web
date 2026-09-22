<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { computed } from 'vue'
import { useTypedT } from '@/shared/composables/useTypedT'

import { useListDiagrams } from '@/features/teacher/composables/useListDiagrams'
import AppBar from '@/shared/components/AppBar.vue'
import StateEmpty from '@/shared/components/StateEmpty.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useIsCompact } from '@/shared/composables/useIsCompact'
import { useCurrentUserStore } from '@/stores/currentUser'

const currentUser = useCurrentUserStore()
const canAuthor = computed(
  () => currentUser.profile?.role === 'teacher' || currentUser.profile?.role === 'admin',
)

const { isCompact } = useIsCompact()
const { diagrams, isLoading, error, retry } = useListDiagrams()
const { t } = useTypedT()
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <AppBar context="teacher" :compact="isCompact" :primary-nav-to="{ name: 'teacher-diagrams' }" />

    <div v-if="!canAuthor" data-test="permission-denied" class="flex flex-1 items-center justify-center p-10">
      <p class="max-w-md text-center text-ink-muted">
        {{ t('common.permissionDenied') }}
      </p>
    </div>

    <div v-else class="flex flex-1 flex-col gap-6 px-[48px] pb-[80px] pt-10">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold text-ink">{{ t('diagramListView.heading') }}</h1>
        <RouterLink
          :to="{ name: 'teacher-diagram-new' }"
          data-test="new-diagram"
          class="flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-2 text-[0.8125rem] font-semibold text-accent-fg"
        >
          <Plus :size="14" aria-hidden="true" />
          {{ t('common.newDiagram') }}
        </RouterLink>
      </div>

      <StateLoading v-if="isLoading" data-test="loading" :noun="t('diagramListView.loadingNoun')" />

      <StateError v-else-if="error" data-test="error" :message="t('diagramListView.loadErrorMessage')" @retry="retry" />

      <StateEmpty
        v-else-if="diagrams.length === 0"
        data-test="empty"
        :heading="t('diagramListView.emptyHeading')"
        :message="t('diagramListView.emptyMessage')"
      >
        <template #action>
          <RouterLink :to="{ name: 'teacher-diagram-new' }" class="text-sm font-semibold text-accent-text underline">
            {{ t('common.newDiagram') }}
          </RouterLink>
        </template>
      </StateEmpty>

      <ul v-else class="flex flex-col gap-2">
        <li v-for="diagram in diagrams" :key="diagram.diagram_id">
          <RouterLink
            :to="{ name: 'teacher-diagram-edit', params: { id: diagram.diagram_id } }"
            data-test="diagram-row"
            class="flex items-center justify-between rounded-md border border-border bg-surface-raised px-4 py-3"
          >
            <span class="font-semibold text-ink">{{ diagram.name }}</span>
          </RouterLink>
        </li>
      </ul>
    </div>
  </div>
</template>
