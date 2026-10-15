<script setup lang="ts">
/**
 * The raw event log behind every engagement number, newest first, filtered by one student, found
 * by name, and by type group. Read-only. Opened from a student, they come picked.
 */
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import type { components } from '@/api/generated/core-domain'
import EventLog from '@/features/admin/components/alpha/EventLog.vue'
import StudentSearchField from '@/features/admin/components/alpha/StudentSearchField.vue'
import { useAlphaStudentNames } from '@/features/admin/composables/useAlphaObservation'
import { EVENT_TYPE_GROUPS, type EventTypeGroup } from '@/features/admin/utils/alphaObservation'
import ChoiceChip from '@/shared/components/ChoiceChip.vue'
import PageBackBar from '@/shared/components/PageBackBar.vue'
import TeachShell from '@/shared/components/TeachShell.vue'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'

type UserRef = components['schemas']['UserRef']

const { t } = useTypedT()
const route = useRoute()
const { sizeClass } = useSizeClass()

// The events filter by the picked student's id at once; their name, for the chip, is known when
// they are picked from the search, or looked up when they come from the address.
const studentId = ref<string | null>(typeof route.query.student === 'string' ? route.query.student : null)
const pickedName = ref<string | null>(null)
const { names } = useAlphaStudentNames(computed(() => (studentId.value ? [studentId.value] : [])))
const picked = computed<UserRef | null>(() => {
  if (!studentId.value) return null
  const name = pickedName.value ?? names.value[studentId.value]
  return name ? { user_id: studentId.value, display_name: name } : null
})

function pick(student: UserRef | null) {
  studentId.value = student?.user_id ?? null
  pickedName.value = student?.display_name ?? null
}

const typeGroup = ref<EventTypeGroup | null>(null)
</script>

<template>
  <TeachShell section="admin-alpha" bar="none">
    <PageBackBar v-if="sizeClass !== 'expanded'" :title="t('engagement.title')" :to="{ name: 'admin-alpha' }" :back-label="t('engagement.backLabel')" />
    <main
      class="mx-auto flex w-full flex-1 flex-col gap-4 px-4 pb-20 pt-4 lg:px-0 lg:pt-8"
      :class="sizeClass === 'medium' ? 'max-w-[560px]' : 'max-w-[880px]'"
    >
      <RouterLink
        v-if="sizeClass === 'expanded'"
        data-test="breadcrumb"
        :to="{ name: 'admin-alpha' }"
        class="self-start text-xs font-semibold text-accent-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        {{ t('engagement.title') }} ›
      </RouterLink>
      <h1 class="text-[28px] font-bold leading-[34px] text-ink">{{ t('engagement.events.title') }}</h1>
      <p class="text-sm text-ink-muted">{{ t('engagement.events.intro') }}</p>

      <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span class="text-xs font-semibold uppercase tracking-wider text-ink-muted" aria-hidden="true">{{ t('engagement.events.studentLabel') }}</span>
        <StudentSearchField :model-value="picked" @update:model-value="pick" />
      </div>

      <div class="flex flex-wrap items-center gap-x-2" role="group" :aria-label="t('engagement.events.typeLabel')">
        <span class="text-xs font-semibold uppercase tracking-wider text-ink-muted">{{ t('engagement.events.typeLabel') }}</span>
        <ChoiceChip data-test="type-chip-all" :label="t('engagement.events.allTypes')" :selected="typeGroup === null" @toggle="typeGroup = null" />
        <ChoiceChip
          v-for="group in EVENT_TYPE_GROUPS"
          :key="group"
          :data-test="`type-chip-${group}`"
          :label="t(`engagement.events.groups.${group}`)"
          :selected="typeGroup === group"
          @toggle="typeGroup = group"
        />
      </div>

      <EventLog :student-id="studentId" :type-group="typeGroup" />
    </main>
  </TeachShell>
</template>
