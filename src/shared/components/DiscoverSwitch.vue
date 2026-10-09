<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import SegmentedControl from '@/shared/components/SegmentedControl.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const { t } = useTypedT()
const route = useRoute()
const router = useRouter()

const CATALOG_ROUTE = { courses: 'course-catalog', paths: 'path-catalog' } as const

// Discover is one destination over two catalogs. The switch replaces the route rather than pushing
// it, so Back leaves Discover instead of stepping through the segments.
const segment = computed<string>({
  get: () => (route.name === CATALOG_ROUTE.paths ? 'paths' : 'courses'),
  set: (value) => {
    if (value === 'courses' || value === 'paths') void router.replace({ name: CATALOG_ROUTE[value] })
  },
})
const options = computed(() => [
  { value: 'courses', label: t('discoverSwitch.courses') },
  { value: 'paths', label: t('discoverSwitch.paths') },
])
</script>

<template>
  <SegmentedControl v-model="segment" :label="t('discoverSwitch.label')" :options="options" test-id-prefix="discover" />
</template>
