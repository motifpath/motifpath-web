<script setup lang="ts">
/**
 * Teach, the separate mode where teachers and admins build content. It has no learner navigation.
 * On a wide screen a Teach sidebar lists the sections, in the order things are composed, then an
 * Admin group for admins, and at its foot Back to learning and the account. On a phone or a tablet
 * Teach home is the hub, under a bar with Teach and the account, and each section page has a bar
 * that goes back to it; a page that brings its own bar, such as an editor, has none.
 */
import { ArrowLeft, House } from 'lucide-vue-next'
import { computed, provide } from 'vue'
import { RouterLink } from 'vue-router'

import AccountMenu from '@/shared/components/AccountMenu.vue'
import BrandMark from '@/shared/components/BrandMark.vue'
import NavItem from '@/shared/components/NavItem.vue'
import { IN_TEACH_SHELL } from '@/shared/components/teachShellContext'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'
import { ADMIN_SECTIONS, TEACHER_SECTIONS } from '@/shared/navigation'
import { useCurrentUserStore } from '@/stores/currentUser'

const props = withDefaults(
  defineProps<{
    /** The route name of the section the page belongs to, marked in the sidebar. */
    section?: string | null
    /** The bar on a phone or a tablet: back to Teach home, Teach home's own, or none for a page
     *  that brings its own bar. */
    bar?: 'back' | 'home' | 'none'
  }>(),
  { section: null, bar: 'back' },
)

const { t } = useTypedT()
const { sizeClass } = useSizeClass()
const currentUser = useCurrentUserStore()

const expanded = computed(() => sizeClass.value === 'expanded')
const isAdmin = computed(() => currentUser.profile?.role === 'admin')
provide(IN_TEACH_SHELL, true)

const shownBar = computed(() => (expanded.value ? 'none' : props.bar))
</script>

<template>
  <div class="flex min-h-dvh bg-surface">
    <aside
      v-if="expanded"
      data-test="teach-sidebar"
      class="sticky top-0 flex h-dvh w-[248px] shrink-0 flex-col gap-0.5 border-r border-border bg-surface-raised p-4"
    >
      <RouterLink
        :to="{ name: 'teach' }"
        class="mb-4 flex items-center gap-2.5 self-start rounded-md pl-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <BrandMark size="md" />
        <span class="text-base font-semibold text-ink">{{ t('accountMenu.teach') }}</span>
      </RouterLink>
      <nav :aria-label="t('accountMenu.teach')" class="flex flex-col gap-0.5">
        <NavItem
          v-for="item in TEACHER_SECTIONS"
          :key="item.name"
          data-test="teach-section"
          layout="row"
          :label="t(item.labelKey)"
          :icon="item.icon"
          :to="{ name: item.name }"
          :current="item.name === section"
        />
        <template v-if="isAdmin">
          <p data-test="teach-admin-label" class="pb-1.5 pl-3 pt-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">{{ t('teach.admin') }}</p>
          <NavItem
            v-for="item in ADMIN_SECTIONS"
            :key="item.name"
            data-test="teach-section"
            layout="row"
            :label="t(item.labelKey)"
            :icon="item.icon"
            :to="{ name: item.name }"
            :current="item.name === section"
          />
        </template>
      </nav>
      <div class="mt-auto flex flex-col gap-0.5 border-t border-border pt-2">
        <NavItem data-test="teach-back-to-learning" layout="row" :label="t('accountMenu.backToLearning')" :icon="House" :to="{ name: 'home' }" />
        <AccountMenu entry="row" />
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header v-if="shownBar === 'home'" data-test="teach-home-bar" class="sticky top-0 z-20 flex h-14 items-center gap-2.5 bg-surface py-1.5 pl-4 pr-1.5">
        <BrandMark />
        <span class="flex-1 text-base font-semibold text-ink">{{ t('accountMenu.teach') }}</span>
        <AccountMenu />
      </header>
      <header v-else-if="shownBar === 'back'" class="sticky top-0 z-20 flex h-14 items-center gap-1 bg-surface py-1 pl-1 pr-2">
        <RouterLink
          data-test="teach-back"
          :to="{ name: 'teach' }"
          class="flex h-12 items-center gap-2 rounded-full px-3 text-base font-semibold text-ink hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <ArrowLeft :size="22" aria-hidden="true" />{{ t('accountMenu.teach') }}
        </RouterLink>
        <AccountMenu class="ml-auto" />
      </header>
      <slot />
    </div>
  </div>
</template>
