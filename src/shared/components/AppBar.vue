<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

import { useAuth } from '@/features/auth/composables/useAuth'
import Icon from '@/shared/components/Icon.vue'
import SignOutLink from '@/shared/components/SignOutLink.vue'
import { useThemeStore } from '@/stores/theme'

const props = withDefaults(
  defineProps<{
    context: 'student' | 'teacher'
    /** Mobile layout: hamburger + nav-only drawer instead of the inline nav pill. */
    compact?: boolean
    /** Destination of the single nav pill: "My path" (student) or "Exercises" (teacher). */
    primaryNavTo: RouteLocationRaw
    /** When set in teacher context, renders as a breadcrumb: Exercises › label. */
    breadcrumbLabel?: string
    showSave?: boolean
    justSaved?: boolean
    onSave?: () => void
  }>(),
  { compact: false, showSave: false, justSaved: false },
)

const { displayInitial } = useAuth()
const themeStore = useThemeStore()

const isStudent = computed(() => props.context === 'student')
const primaryNavLabel = computed(() => (isStudent.value ? 'My path' : 'Exercises'))
const hasCrumb = computed(() => !isStudent.value && !!props.breadcrumbLabel)

const drawerOpen = ref(false)
function toggleDrawer(): void {
  drawerOpen.value = !drawerOpen.value
}
function closeDrawer(): void {
  drawerOpen.value = false
}

const accountMenuOpen = ref(false)
function toggleAccountMenu(): void {
  accountMenuOpen.value = !accountMenuOpen.value
}
function closeAccountMenu(): void {
  accountMenuOpen.value = false
}
</script>

<template>
  <div
    class="relative flex h-16 items-center gap-4 bg-surface-raised px-6 shadow-level1"
  >
    <button
      v-if="compact"
      type="button"
      data-test="app-bar-menu"
      aria-label="Menu"
      class="-ml-2 flex h-10 w-10 items-center justify-center rounded-[10px] text-ink"
      @click="toggleDrawer"
    >
      <Icon name="menu" :size="18" />
    </button>

    <div class="flex items-center gap-2.5">
      <div class="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-accent-muted">
        <svg width="16" height="16" viewBox="200 100 860 860" role="img" aria-label="MotifPath">
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
      <span class="text-[15px] font-bold text-ink">MotifPath</span>
    </div>

    <template v-if="!compact">
      <div class="h-[22px] w-px bg-border" />

      <RouterLink
        v-if="!hasCrumb"
        :to="primaryNavTo"
        class="rounded-full bg-accent-muted px-3.5 py-1.5 text-sm font-semibold text-accent-text"
        >{{ primaryNavLabel }}</RouterLink
      >
      <div v-else class="flex items-center gap-1.5 text-[13px]">
        <RouterLink :to="primaryNavTo" class="text-ink-muted">Exercises</RouterLink>
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
      >Saved</span
    >

    <button
      v-if="showSave"
      type="button"
      data-test="app-bar-save"
      class="rounded-full bg-accent px-[18px] py-2 text-[13px] font-bold text-accent-fg"
      @click="onSave?.()"
    >
      Save
    </button>

    <button
      type="button"
      data-test="app-bar-theme-toggle"
      :aria-pressed="themeStore.theme === 'dark'"
      aria-label="Toggle theme"
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-ink-muted"
      @click="themeStore.toggle()"
    >
      <Icon :name="themeStore.theme === 'dark' ? 'sun' : 'moon'" :size="15" />
    </button>

    <button
      type="button"
      data-test="app-bar-avatar"
      aria-label="Account menu"
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-accent-fg"
      @click="toggleAccountMenu"
    >
      {{ displayInitial }}
    </button>

    <template v-if="accountMenuOpen">
      <div
        data-test="app-bar-account-menu-overlay"
        class="fixed inset-0 z-30"
        @click="closeAccountMenu"
      />
      <div
        data-test="app-bar-account-menu"
        class="absolute right-6 top-14 z-40 rounded-lg border border-border bg-surface-raised p-1.5 shadow-level2"
        @click="closeAccountMenu"
      >
        <SignOutLink class="block w-full px-2.5 py-1.5 text-left" />
      </div>
    </template>

    <template v-if="compact && drawerOpen">
      <div
        class="fixed inset-x-0 bottom-0 top-16 z-30 bg-[#05072C]/45"
        @click="closeDrawer"
      />
      <div
        data-test="app-bar-drawer"
        class="fixed bottom-0 left-0 top-16 z-40 flex w-[260px] flex-col bg-surface-raised py-4 shadow-level1"
      >
        <RouterLink
          :to="primaryNavTo"
          class="mx-3 rounded-[10px] bg-accent-muted px-3.5 py-3 text-sm font-semibold text-accent-text"
          @click="closeDrawer"
          >{{ primaryNavLabel }}</RouterLink
        >
        <div v-if="hasCrumb" class="px-[26px] pt-2 text-xs text-ink-subtle">— editing {{ breadcrumbLabel }}</div>
      </div>
    </template>
  </div>
</template>
