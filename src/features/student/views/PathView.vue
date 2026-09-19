<script setup lang="ts">
import { useTypedT } from '@/shared/composables/useTypedT'

import PathContent from '@/features/student/components/PathContent.vue'
import { useStudentPath } from '@/features/student/composables/useStudentPath'
import StateEmpty from '@/shared/components/StateEmpty.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'

const { data, error, isLoading, retry } = useStudentPath()
const { t } = useTypedT()
</script>

<template>
  <section>
    <h1 class="mb-4 text-2xl font-semibold text-accent-text">{{ t('pathView.heading') }}</h1>

    <StateLoading v-if="isLoading" data-test="loading" :noun="t('pathView.loadingNoun')" />

    <StateEmpty
      v-else-if="error === 'no-path'"
      data-test="no-path"
      :heading="t('pathView.emptyHeading')"
      :message="t('pathView.emptyMessage')"
    />

    <StateError
      v-else-if="error"
      data-test="error"
      :message="t('pathView.errorMessage')"
      @retry="retry()"
    />

    <PathContent v-else-if="data" :view="data" />
  </section>
</template>
