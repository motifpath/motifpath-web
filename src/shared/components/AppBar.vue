<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

import AccountMenu from '@/shared/components/AccountMenu.vue'
import BrandMark from '@/shared/components/BrandMark.vue'
import Icon from '@/shared/components/Icon.vue'
import { type NavSection, TEACHER_SECTIONS, authoringSectionsFor } from '@/shared/navigation'
import { useCurrentUserStore } from '@/stores/currentUser'

const props = withDefaults(
  defineProps<{
    /** Mobile layout: hamburger + nav-only drawer instead of the inline tabs. */
    compact?: boolean
    /**
     * Which authoring tab (Content/Paths/…) is active, and the breadcrumb root when
     * breadcrumbLabel is set.
     */
    primaryNavTo?: RouteLocationRaw
    /** When set, renders as a breadcrumb: Exercises › label. */
    breadcrumbLabel?: string
    showSave?: boolean
    saveDisabled?: boolean
    justSaved?: boolean
    onSave?: () => void
  }>(),
  { compact: false, showSave: false, saveDisabled: false, justSaved: false },
)

const { t } = useTypedT()

const currentUser = useCurrentUserStore()

const hasCrumb = computed(() => !!props.breadcrumbLabel)

// Permanent authoring sections, resolved against `primaryNavTo`'s route name (never
// route-inferred, same explicit-prop style as breadcrumbLabel), which also drives which tab
// renders active and which section a breadcrumb drills down from.
const navItems = computed<NavSection[]>(() => authoringSectionsFor(currentUser.profile?.role))
const primaryNavToName = computed(() => (props.primaryNavTo as { name?: string } | undefined)?.name)
const fallbackSection = computed(() => TEACHER_SECTIONS.find((section) => section.name === 'teacher-exercises')!)
const activeSection = computed<NavSection>(() => {
  const match = navItems.value.find((item) => item.name === primaryNavToName.value)
  if (!match && import.meta.env.DEV) {
    // Falling back silently would highlight the wrong tab and mislabel the
    // breadcrumb root with no visible sign anything's wrong — surface it
    // loudly in development instead of shipping a plausible-looking bug.
    console.warn(
      `AppBar: primaryNavTo route name "${String(primaryNavToName.value)}" is not one of the known authoring ` +
        `sections (${navItems.value.map((item) => item.name).join(', ')}); falling back to "${fallbackSection.value.name}".`,
    )
  }
  return match ?? fallbackSection.value
})

const drawerOpen = ref(false)
function toggleDrawer(): void {
  drawerOpen.value = !drawerOpen.value
}
function closeDrawer(): void {
  drawerOpen.value = false
}
</script>

<template>
  <div
    class="sticky top-0 z-20 flex h-16 items-center gap-4 bg-surface-raised px-5 shadow-level1"
  >
    <button
      v-if="compact"
      type="button"
      data-test="app-bar-menu"
      :aria-label="t('appBar.menuAriaLabel')"
      class="-ml-2 flex h-10 w-10 items-center justify-center rounded-[10px] text-ink"
      @click="toggleDrawer"
    >
      <Icon name="menu" :size="18" />
    </button>

    <RouterLink :to="{ name: 'home' }" data-test="app-bar-home" class="flex items-center gap-2.5">
      <BrandMark />
      <span class="text-[15px] font-bold text-ink">{{ t('appBar.brand') }}</span>
    </RouterLink>

    <template v-if="!compact">
      <div class="h-[22px] w-px bg-border" />

      <div v-if="!hasCrumb" data-test="app-bar-tabs" class="flex items-center gap-1">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="rounded-full px-3.5 py-1.5 text-sm font-semibold"
          :class="item.name === activeSection.name ? 'bg-accent-muted text-accent-text' : 'text-ink-muted'"
          >{{ t(item.labelKey) }}</RouterLink
        >
      </div>

      <div v-else class="flex items-center gap-1.5 text-[13px]">
        <RouterLink :to="primaryNavTo ?? { name: fallbackSection.name }" class="text-ink-muted">{{
          t(activeSection.labelKey)
        }}</RouterLink>
        <Icon name="chevron-right" :size="14" class="text-ink-subtle" />
        <span class="rounded-full bg-accent-muted px-3.5 py-1.5 text-sm font-semibold text-accent-text">{{
          breadcrumbLabel
        }}</span>
      </div>
    </template>

    <div class="flex-1" />

    <span
      v-if="justSaved"
      class="rounded-full bg-accent-muted px-3 py-[5px] text-xs font-semibold text-accent-text"
      >{{ t('buttons.saved') }}</span
    >

    <!-- Page-specific save actions (e.g. "Save as…"), kept next to Save so every way of saving is in one place. -->
    <slot name="actions" />

    <button
      v-if="showSave"
      type="button"
      data-test="app-bar-save"
      :disabled="saveDisabled"
      class="rounded-full bg-accent px-[18px] py-2 text-[13px] font-bold text-accent-fg disabled:opacity-50"
      @click="onSave?.()"
    >
      {{ t('buttons.save') }}
    </button>

    <AccountMenu />

    <template v-if="compact && drawerOpen">
      <div
        class="fixed inset-x-0 bottom-0 top-16 z-30 bg-scrim/40"
        @click="closeDrawer"
      />
      <div
        data-test="app-bar-drawer"
        class="fixed bottom-0 left-0 top-16 z-40 flex w-[260px] flex-col gap-1 bg-surface-raised py-4 shadow-level1"
      >
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="mx-3 rounded-[10px] px-3.5 py-3 text-sm font-semibold"
          :class="item.name === activeSection.name ? 'bg-accent-muted text-accent-text' : 'text-ink-muted'"
          @click="closeDrawer"
          >{{ t(item.labelKey) }}</RouterLink
        >
        <div v-if="hasCrumb" class="px-[26px] pt-2 text-xs text-ink-subtle">
          {{ t('appBar.editingCrumb', { label: breadcrumbLabel ?? '' }) }}
        </div>
      </div>
    </template>
  </div>
</template>
