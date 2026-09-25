<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import AppBar from '@/shared/components/AppBar.vue'
import { useIsCompact } from '@/shared/composables/useIsCompact'

const { isCompact } = useIsCompact()

// A route can opt into a wider content column (route.meta.wideContent) —
// currently only the lesson screen, whose video would otherwise be squeezed
// into the app's usual reading-width column even when the viewport has
// spare room beside it. That column grows again past a large-desktop
// viewport (2xl) rather than staying capped the same as a laptop, so a wide
// monitor isn't left with the video and its cue pinned to a laptop-sized
// strip in the middle of the screen.
const route = useRoute()
// Which student tab a route sits under: the catalog and "my courses" are
// their own sections; everything else (the path and the lesson/practice
// screens reached from it) belongs to My path.
const STUDENT_SECTIONS = new Set(['my-courses', 'course-catalog'])
const primaryNavTo = computed(() => {
  const name = typeof route.name === 'string' ? route.name : ''
  return { name: STUDENT_SECTIONS.has(name) ? name : 'path' }
})

const contentWidthClass = computed(() =>
  route.meta.wideContent ? 'max-w-7xl 2xl:max-w-[96rem]' : 'max-w-4xl',
)
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AppBar context="student" :compact="isCompact" :primary-nav-to="primaryNavTo" />

    <main class="mx-auto w-full flex-1 px-4 py-8" :class="contentWidthClass">
      <RouterView />
    </main>
  </div>
</template>
