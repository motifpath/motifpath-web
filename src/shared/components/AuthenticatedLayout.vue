<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

import AppBar from '@/shared/components/AppBar.vue'
import { useIsCompact } from '@/shared/composables/useIsCompact'
import { useTypedT } from '@/shared/composables/useTypedT'

const { t } = useTypedT()

const { isCompact } = useIsCompact()

// A route can opt into a wider content column (route.meta.wideContent) —
// currently only the lesson screen, whose video would otherwise be squeezed
// into the app's usual reading-width column even when the viewport has
// spare room beside it. That column grows again past a large-desktop
// viewport (2xl) rather than staying capped the same as a laptop, so a wide
// monitor isn't left with the video and its cue pinned to a laptop-sized
// strip in the middle of the screen.
const route = useRoute()
// Which student tab a route sits under: each catalog and "my courses" are
// their own sections (a finished course's screen sits
// under My courses, and a detail page under the catalog it belongs to);
// everything else (the path and the lesson/practice screens reached from it)
// belongs to My path.
const STUDENT_SECTIONS = new Map([
  ['my-courses', 'my-courses'],
  ['course-completed', 'my-courses'],
  ['course-catalog', 'course-catalog'],
  ['course-detail', 'course-catalog'],
  ['path-catalog', 'path-catalog'],
  ['path-detail', 'path-catalog'],
])
const primaryNavTo = computed(() => {
  const name = typeof route.name === 'string' ? route.name : ''
  return { name: STUDENT_SECTIONS.get(name) ?? 'path' }
})

const contentWidthClass = computed(() =>
  route.meta.wideContent ? 'max-w-7xl 2xl:max-w-[96rem]' : 'max-w-4xl',
)
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AppBar context="student" :compact="isCompact" :primary-nav-to="primaryNavTo" />

    <main class="mx-auto w-full flex-1 px-4 py-5 sm:py-8" :class="contentWidthClass">
      <RouterView />
    </main>

    <footer class="mx-auto w-full px-4 pb-6 text-xs text-ink-subtle" :class="contentWidthClass">
      <RouterLink :to="{ name: 'credits' }" class="hover:text-ink-muted hover:underline">{{ t('footer.credits') }}</RouterLink>
    </footer>
  </div>
</template>
