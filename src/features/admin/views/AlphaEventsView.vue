<script setup lang="ts">
/**
 * The raw event log behind every engagement number, newest first, filtered by student (one chip
 * each) and by type group. Read-only. Opened from a student, their chip comes picked.
 */
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import EventLog from '@/features/admin/components/alpha/EventLog.vue'
import { useAlphaObservation } from '@/features/admin/composables/useAlphaObservation'
import { EVENT_TYPE_GROUPS, type EventTypeGroup } from '@/features/admin/utils/alphaObservation'
import ChoiceChip from '@/shared/components/ChoiceChip.vue'
import PageBackBar from '@/shared/components/PageBackBar.vue'
import TeachShell from '@/shared/components/TeachShell.vue'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'

const { t } = useTypedT()
const route = useRoute()
const { sizeClass } = useSizeClass()

// The students' names come from the running week's observation, which lists everyone in the alpha.
const { observation } = useAlphaObservation(ref(undefined))
const students = computed(() => observation.value?.students ?? [])
const names = computed(() => Object.fromEntries(students.value.map((s) => [s.student_id, s.display_name])))

const studentId = ref<string | null>(typeof route.query.student === 'string' ? route.query.student : null)
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

      <div class="flex flex-wrap items-center gap-x-2" role="group" :aria-label="t('engagement.events.studentLabel')">
        <span class="text-xs font-semibold uppercase tracking-wider text-ink-muted">{{ t('engagement.events.studentLabel') }}</span>
        <ChoiceChip data-test="student-chip-all" :label="t('engagement.events.allStudents')" :selected="studentId === null" @toggle="studentId = null" />
        <ChoiceChip
          v-for="student in students"
          :key="student.student_id"
          :data-test="`student-chip-${student.student_id}`"
          :label="student.display_name"
          :selected="studentId === student.student_id"
          @toggle="studentId = student.student_id"
        />
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

      <EventLog :student-id="studentId" :type-group="typeGroup" :names="names" />
    </main>
  </TeachShell>
</template>
