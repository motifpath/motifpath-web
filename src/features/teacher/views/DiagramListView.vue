<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useTypedT } from '@/shared/composables/useTypedT'

import { type DiagramFilters, useListDiagrams } from '@/features/teacher/composables/useListDiagrams'
import AppBar from '@/shared/components/AppBar.vue'
import LoadMoreButton from '@/shared/components/LoadMoreButton.vue'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
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
const { t } = useTypedT()
const { localizedName } = useLocalizedName()

// all: every diagram the caller may see (for a teacher, the templates plus their own);
// templates: basic diagrams only; mine: the ones the caller created.
type Scope = 'all' | 'templates' | 'mine'
const scopes: Scope[] = ['all', 'templates', 'mine']
const scope = ref<Scope>('all')

function filtersFor(selected: Scope): DiagramFilters {
  if (selected === 'templates') return { kind: 'basic' }
  if (selected === 'mine') return { createdBy: currentUser.profile?.user_id }
  return {}
}

const { diagrams, total, isLoading, isLoadingMore, error, loadMoreError, reload, loadMore } =
  useListDiagrams(() => filtersFor(scope.value))

function selectScope(selected: Scope) {
  if (selected === scope.value) return
  scope.value = selected
  void reload()
}
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

      <div class="flex w-fit gap-1 rounded-lg bg-surface-sunken p-1" role="group" :aria-label="t('diagramListView.scopeLabel')">
        <button
          v-for="option in scopes"
          :key="option"
          type="button"
          :data-test="`filter-${option}`"
          :aria-pressed="scope === option"
          class="rounded-md px-3 py-1 text-xs font-semibold"
          :class="scope === option ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="selectScope(option)"
        >
          {{ t(`diagramListView.scopes.${option}`) }}
        </button>
      </div>

      <StateLoading v-if="isLoading" data-test="loading" :noun="t('diagramListView.loadingNoun')" />

      <StateError v-else-if="error" data-test="error" :message="t('diagramListView.loadErrorMessage')" @retry="reload" />

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

      <template v-else>
        <ul class="flex flex-col gap-2">
          <li v-for="diagram in diagrams" :key="diagram.diagram_id">
            <RouterLink
              :to="{ name: 'teacher-diagram-edit', params: { id: diagram.diagram_id } }"
              data-test="diagram-row"
              class="flex items-center justify-between rounded-md border border-border bg-surface-raised px-4 py-3"
            >
              <span class="font-semibold text-ink">{{ localizedName(diagram.names) }}</span>
              <span
                v-if="diagram.kind === 'basic'"
                data-test="template-badge"
                class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-xs font-semibold text-ink-muted"
              >{{ t('diagramListView.templateBadge') }}</span>
            </RouterLink>
          </li>
        </ul>
        <LoadMoreButton
          :loaded="diagrams.length"
          :total="total"
          :loading="isLoadingMore"
          :failed="loadMoreError"
          @load="loadMore"
        />
      </template>
    </div>
  </div>
</template>
