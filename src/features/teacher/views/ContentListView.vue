<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { computed } from 'vue'

import { useListContentNodes } from '@/features/teacher/composables/useListContentNodes'
import AppBar from '@/shared/components/AppBar.vue'
import LoadMoreButton from '@/shared/components/LoadMoreButton.vue'
import StateEmpty from '@/shared/components/StateEmpty.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useIsCompact } from '@/shared/composables/useIsCompact'
import { useTypedT } from '@/shared/composables/useTypedT'
import { useCurrentUserStore } from '@/stores/currentUser'

const currentUser = useCurrentUserStore()
const canAuthor = computed(
  () => currentUser.profile?.role === 'teacher' || currentUser.profile?.role === 'admin',
)

const { isCompact } = useIsCompact()
const { t } = useTypedT()
const { contentNodes, total, isLoading, isLoadingMore, error, loadMoreError, retry, loadMore } =
  useListContentNodes()
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <AppBar context="teacher" :compact="isCompact" :primary-nav-to="{ name: 'teacher-content' }" />

    <div v-if="!canAuthor" data-test="permission-denied" class="flex flex-1 items-center justify-center p-10">
      <p class="max-w-md text-center text-ink-muted">
        {{ t('contentListView.permissionDenied') }}
      </p>
    </div>

    <div v-else class="flex flex-1 flex-col gap-6 px-[48px] pb-[80px] pt-10">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold text-ink">{{ t('contentListView.heading') }}</h1>
        <RouterLink
          :to="{ name: 'teacher-content-new' }"
          data-test="new-content-node"
          class="flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-2 text-[0.8125rem] font-semibold text-accent-fg"
        >
          <Plus :size="14" aria-hidden="true" />
          {{ t('contentListView.newContentLabel') }}
        </RouterLink>
      </div>

      <StateLoading v-if="isLoading" data-test="loading" :noun="t('contentListView.loadingNoun')" />

      <StateError v-else-if="error" data-test="error" :message="t('contentListView.errorMessage')" @retry="retry" />

      <StateEmpty
        v-else-if="contentNodes.length === 0"
        data-test="empty"
        :heading="t('contentListView.emptyHeading')"
        :message="t('contentListView.emptyMessage')"
      >
        <template #action>
          <RouterLink :to="{ name: 'teacher-content-new' }" class="text-sm font-semibold text-accent-text underline">
            {{ t('contentListView.newContentLabel') }}
          </RouterLink>
        </template>
      </StateEmpty>

      <template v-else>
        <ul class="flex flex-col gap-2">
          <li v-for="contentNode in contentNodes" :key="contentNode.content_node_id">
            <RouterLink
              :to="{ name: 'teacher-content-edit', params: { id: contentNode.content_node_id } }"
              data-test="content-node-row"
              class="flex items-center justify-between rounded-md border border-border bg-surface-raised px-4 py-3"
            >
              <span class="font-semibold text-ink">{{ contentNode.title }}</span>
              <span class="text-sm text-ink-subtle">{{ t(`common.contentTypes.${contentNode.content_type}`) }}</span>
            </RouterLink>
          </li>
        </ul>
        <LoadMoreButton
          :loaded="contentNodes.length"
          :total="total"
          :loading="isLoadingMore"
          :failed="loadMoreError"
          @load="loadMore"
        />
      </template>
    </div>
  </div>
</template>
