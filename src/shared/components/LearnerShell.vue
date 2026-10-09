<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import AccountMenu from '@/shared/components/AccountMenu.vue'
import BrandMark from '@/shared/components/BrandMark.vue'
import NavigationBar from '@/shared/components/NavigationBar.vue'
import NavigationRail from '@/shared/components/NavigationRail.vue'
import NavigationSidebar from '@/shared/components/NavigationSidebar.vue'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'
import { destinationOf } from '@/shared/navigation'
import { useCurrentUserStore } from '@/stores/currentUser'

const { t } = useTypedT()
const route = useRoute()
const { sizeClass } = useSizeClass()
const currentUser = useCurrentUserStore()

const current = computed(() => destinationOf(typeof route.name === 'string' ? route.name : undefined))
const canTeach = computed(() => currentUser.profile?.role === 'teacher' || currentUser.profile?.role === 'admin')
// A lesson takes the phone's full height; the rail and the sidebar cost no height, so they stay.
const showsBottomBar = computed(() => sizeClass.value === 'compact' && !route.meta.hidesBottomBar)

// A route can opt into a wider content column (route.meta.wideContent) — the lesson, whose video
// would otherwise be squeezed into the reading-width column — growing again on a large desktop.
const contentWidthClass = computed(() => (route.meta.wideContent ? 'max-w-7xl 2xl:max-w-[96rem]' : 'max-w-4xl'))

// Toasts sit at the foot of the screen; while the bottom bar is there they rise above it. The bar's
// height includes the home-indicator inset, so it is measured rather than assumed.
const bottomBar = ref<{ $el: HTMLElement } | null>(null)
let resizeObserver: ResizeObserver | null = null

function setToastClearance(bar: HTMLElement | undefined) {
  if (bar) document.documentElement.style.setProperty('--toast-clearance', `calc(${bar.offsetHeight}px + 0.5rem)`)
  else document.documentElement.style.removeProperty('--toast-clearance')
}

function trackBottomBar(bar: HTMLElement | undefined) {
  resizeObserver?.disconnect()
  resizeObserver = null
  setToastClearance(bar)
  if (bar && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => setToastClearance(bar))
    resizeObserver.observe(bar)
  }
}

onMounted(() => trackBottomBar(bottomBar.value?.$el))
watch(() => bottomBar.value?.$el, trackBottomBar, { flush: 'post' })

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  setToastClearance(undefined)
})
</script>

<template>
  <!-- The App Shell: the same five destinations everywhere; only their container follows the size
       class — a bottom bar on a phone, a rail on a tablet, a sidebar on a desktop. -->
  <div class="flex min-h-dvh">
    <NavigationRail
      v-if="sizeClass === 'medium'"
      data-test="navigation-rail"
      class="sticky top-0 h-dvh shrink-0"
      :current="current"
    >
      <template #account><AccountMenu /></template>
    </NavigationRail>
    <NavigationSidebar
      v-else-if="sizeClass === 'expanded'"
      data-test="navigation-sidebar"
      class="sticky top-0 h-dvh shrink-0"
      :current="current"
      :show-teach="canTeach"
    >
      <template #account><AccountMenu entry="row" /></template>
    </NavigationSidebar>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        v-if="sizeClass === 'compact'"
        data-test="learner-top-bar"
        class="sticky top-0 z-20 flex h-14 items-center gap-2.5 bg-surface-raised pl-5 pr-2 shadow-level1"
      >
        <RouterLink :to="{ name: 'home' }" class="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
          <BrandMark />
          <span class="text-base font-bold text-ink">{{ t('appBar.brand') }}</span>
        </RouterLink>
        <AccountMenu class="ml-auto" />
      </header>

      <main class="mx-auto w-full flex-1 px-4 py-5 sm:py-8" :class="contentWidthClass">
        <slot />
      </main>

      <footer class="mx-auto w-full px-4 pb-6 text-xs text-ink-subtle" :class="contentWidthClass">
        <RouterLink :to="{ name: 'credits' }" class="hover:text-ink-muted hover:underline">{{ t('footer.credits') }}</RouterLink>
      </footer>

      <NavigationBar
        v-if="showsBottomBar"
        ref="bottomBar"
        data-test="navigation-bar"
        class="sticky bottom-0 z-20"
        :current="current"
      />
    </div>
  </div>
</template>
