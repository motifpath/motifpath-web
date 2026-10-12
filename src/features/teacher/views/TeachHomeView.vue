<script setup lang="ts">
/**
 * Teach home: what Teach is for, and one row per section, in the order things are composed, then
 * an Admin group for admins. On a phone or a tablet it is the hub every section page goes back to.
 */
import { computed } from 'vue'

import MenuRow from '@/shared/components/MenuRow.vue'
import TeachShell from '@/shared/components/TeachShell.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { ADMIN_SECTIONS, TEACHER_SECTIONS } from '@/shared/navigation'
import { useCurrentUserStore } from '@/stores/currentUser'

const { t } = useTypedT()
const currentUser = useCurrentUserStore()
const isAdmin = computed(() => currentUser.profile?.role === 'admin')
</script>

<template>
  <TeachShell bar="home">
    <main class="mx-auto flex w-full max-w-[880px] flex-col gap-1 pb-6 pt-2 lg:px-6 lg:pt-8">
      <div class="flex flex-col gap-1.5 px-5 pb-3">
        <h1 class="text-[28px] font-bold leading-[34px] text-ink">{{ t('accountMenu.teach') }}</h1>
        <p class="text-sm text-ink-muted">{{ t('teach.intro') }}</p>
      </div>
      <MenuRow
        v-for="item in TEACHER_SECTIONS"
        :key="item.name"
        data-test="teach-home-section"
        :label="t(item.labelKey)"
        :icon="item.icon"
        :to="{ name: item.name }"
        chevron
      />
      <template v-if="isAdmin">
        <p data-test="teach-home-admin" class="px-5 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">{{ t('teach.admin') }}</p>
        <MenuRow
          v-for="item in ADMIN_SECTIONS"
          :key="item.name"
          data-test="teach-home-section"
          :label="t(item.labelKey)"
          :icon="item.icon"
          :to="{ name: item.name }"
          chevron
        />
      </template>
    </main>
  </TeachShell>
</template>
