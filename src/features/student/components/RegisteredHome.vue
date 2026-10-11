<script setup lang="ts">
/**
 * A registered student's home: the first run while they have never started a course or a path,
 * otherwise the home they know. When that can't be told, one retry, and neither of them — a new
 * student must not see an empty This week, nor a returning one the questions.
 */
import FirstRun from '@/features/student/components/FirstRun.vue'
import StudentHome from '@/features/student/components/StudentHome.vue'
import { useFirstRun } from '@/features/student/composables/useFirstRun'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const { t } = useTypedT()
const { status, retry } = useFirstRun()
</script>

<template>
  <FirstRun v-if="status === 'first-run'" />
  <StudentHome v-else-if="status === 'returning'" />
  <LoadFailed v-else-if="status === 'failed'" :message="t('firstRun.homeError')" @retry="retry()" />
  <LoadingSkeleton v-else />
</template>
