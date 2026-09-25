<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

import AccountMenu from '@/shared/components/AccountMenu.vue'
import Icon from '@/shared/components/Icon.vue'
import { STUDENT_SECTIONS, TEACHER_SECTIONS, studentSectionsFor } from '@/shared/navigation'
import { useCurrentUserStore } from '@/stores/currentUser'
import { useThemeStore } from '@/stores/theme'

const props = withDefaults(
  defineProps<{
    context: 'student' | 'teacher'
    /** Mobile layout: hamburger + nav-only drawer instead of the inline nav pill. */
    compact?: boolean
    /**
     * Student: destination of the single nav pill ("My path"). Teacher: which
     * of the three permanent tabs (Content/Paths/Exercises) is active, and
     * the breadcrumb root when breadcrumbLabel is set.
     */
    primaryNavTo: RouteLocationRaw
    /** When set in teacher context, renders as a breadcrumb: Exercises › label. */
    breadcrumbLabel?: string
    showSave?: boolean
    saveDisabled?: boolean
    justSaved?: boolean
    onSave?: () => void
  }>(),
  { compact: false, showSave: false, saveDisabled: false, justSaved: false },
)

const themeStore = useThemeStore()
const { t } = useTypedT()

const isStudent = computed(() => props.context === 'student')
const hasCrumb = computed(() => !isStudent.value && !!props.breadcrumbLabel)

// Permanent top-level sections, resolved against `primaryNavTo`'s route name
// (never route-inferred, same explicit-prop style as breadcrumbLabel) so a
// view's existing `primary-nav-to="{ name: 'teacher-exercises' }"` keeps
// working unchanged and also drives which tab renders active / which section
// a breadcrumb drills down from. A teacher on the student side gets no course
// tabs: only a learner can enroll in or switch between courses.
const currentUser = useCurrentUserStore()
const studentNavItems = computed(() => studentSectionsFor(currentUser.profile?.role))
const teacherNavItems = TEACHER_SECTIONS
const navItems = computed(() => (isStudent.value ? studentNavItems.value : teacherNavItems))
const primaryNavToName = computed(() => (props.primaryNavTo as { name?: string }).name)
const fallbackSection = computed(() => (isStudent.value ? STUDENT_SECTIONS[0]! : TEACHER_SECTIONS[2]!))
const activeSection = computed(() => {
  const match = navItems.value.find((item) => item.name === primaryNavToName.value)
  if (!match && import.meta.env.DEV) {
    // Falling back silently would highlight the wrong tab and mislabel the
    // breadcrumb root with no visible sign anything's wrong — surface it
    // loudly in development instead of shipping a plausible-looking bug.
    console.warn(
      `AppBar: primaryNavTo route name "${String(primaryNavToName.value)}" is not one of the known ${props.context} ` +
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
      <div class="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-accent-muted">
        <svg width="16" height="16" viewBox="200 100 860 860" role="img" :aria-label="t('appBar.brand')">
          <defs>
            <linearGradient id="app-bar-mark" x1="309" y1="190" x2="938" y2="890" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#a14cff" />
              <stop offset=".27" stop-color="#8134ff" />
              <stop offset=".62" stop-color="#6421fa" />
              <stop offset="1" stop-color="#4714df" />
            </linearGradient>
          </defs>
          <path
            d="M346 203C314 203 290 218 279 243c-4 9-6 19-6 30v526c0 41 32 74 73 74h85c40 0 80-11 108-33 20-16 19-38 8-57-8-16-23-32-41-49l-53-50c-32-31-47-58-40-84 8-30 38-58 81-82l46-27c36-21 49-45 41-71-3-13-10-23-21-34L397 225c-14-14-32-22-51-22Z"
            fill="url(#app-bar-mark)"
          />
          <path
            d="M689 873c38-24 49-54 35-85-13-30-42-55-83-80l-71-44c-50-31-77-58-73-86 4-29 29-55 69-84 34-24 63-50 89-77l191-193c18-18 41-25 64-25 42 0 76 33 76 77v522c0 42-33 75-75 75H689Z"
            fill="url(#app-bar-mark)"
          />
        </svg>
      </div>
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
        <RouterLink :to="primaryNavTo" class="text-ink-muted">{{ t(activeSection.labelKey) }}</RouterLink>
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

    <button
      type="button"
      data-test="app-bar-theme-toggle"
      :aria-pressed="themeStore.theme === 'dark'"
      :aria-label="t('appBar.themeToggleAriaLabel')"
      class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-ink-muted"
      @click="themeStore.toggle()"
    >
      <Icon :name="themeStore.theme === 'dark' ? 'sun' : 'moon'" :size="15" />
    </button>

    <AccountMenu />

    <template v-if="compact && drawerOpen">
      <div
        class="fixed inset-x-0 bottom-0 top-16 z-30 bg-brand-ground/45"
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
