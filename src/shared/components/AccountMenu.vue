<script setup lang="ts">
import { Check, CircleUserRound, GraduationCap, Languages, LogOut, Mail, PencilRuler } from 'lucide-vue-next'
import { computed, inject, onMounted, ref, useId, watch } from 'vue'
import { routeLocationKey } from 'vue-router'

import { useAuth } from '@/features/auth/composables/useAuth'
import type { MessageKey, SupportedLocale } from '@/i18n'
import UserAvatar from '@/shared/components/UserAvatar.vue'
import MenuRow from '@/shared/components/MenuRow.vue'
import OverlayLayer from '@/shared/components/OverlayLayer.vue'
import SegmentedControl from '@/shared/components/SegmentedControl.vue'
import SheetHeader from '@/shared/components/SheetHeader.vue'
import SwitchRow from '@/shared/components/SwitchRow.vue'
import { useAccountMenuRequest } from '@/shared/composables/useAccountMenuRequest'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'
import { anchoredPosition, type AnchoredPosition } from '@/shared/utils/anchoredPosition'
import { useCurrentUserStore, type EmailPreference } from '@/stores/currentUser'
import { useThemeStore, type ThemePreference } from '@/stores/theme'

const LANGUAGES: { code: SupportedLocale; labelKey: MessageKey }[] = [
  { code: 'en', labelKey: 'accountMenu.en' },
  { code: 'pt-BR', labelKey: 'accountMenu.ptBr' },
]
// The short name, for the Language row's value.
const SHORT_LANGUAGE: Record<SupportedLocale, MessageKey> = { en: 'localeSwitcher.en', 'pt-BR': 'localeSwitcher.ptBr' }

const EMAIL_SWITCHES: { preference: EmailPreference; labelKey: MessageKey; descriptionKey: MessageKey }[] = [
  { preference: 'progress_report', labelKey: 'accountMenu.emailProgressReport', descriptionKey: 'accountMenu.emailProgressReportDescription' },
  { preference: 'reminders', labelKey: 'accountMenu.emailReminders', descriptionKey: 'accountMenu.emailRemindersDescription' },
]

withDefaults(
  defineProps<{
    /** `avatar`: the app bar and the rail. `row`: an "Account" row at the foot of the sidebar. */
    entry?: 'avatar' | 'row'
  }>(),
  { entry: 'avatar' },
)

const { displayInitial, email, signOut } = useAuth()
const { t } = useTypedT()
const { sizeClass, isCompact } = useSizeClass()
const currentUser = useCurrentUserStore()
const themeStore = useThemeStore()

const open = ref(false)
const view = ref<'main' | 'language' | 'emails'>('main')
const trigger = ref<HTMLElement | null>(null)
const position = ref<AnchoredPosition>({})
const languageTitleId = useId()
const emailsTitleId = useId()

const role = computed(() => currentUser.profile?.role)
// On a desktop the sidebar shows Teach on its own row, so the menu leaves it out.
const canTeach = computed(() => (role.value === 'teacher' || role.value === 'admin') && sizeClass.value !== 'expanded')
// Learning is open to every role and only authoring is role-gated, so a page that requires a role
// is inside Teach. Read without `useRoute()` so the menu also renders where no router is set up.
const route = inject(routeLocationKey, null)
const inTeach = computed(() => Array.isArray(route?.meta.requiresRole))
const roleLabel = computed(() =>
  role.value === 'teacher' ? t('accountMenu.roleTeacher') : role.value === 'admin' ? t('accountMenu.roleAdmin') : '',
)
const subline = computed(() => [roleLabel.value, email.value].filter(Boolean).join(' · '))

const emailPreferences = computed(() => currentUser.profile?.email_preferences)
const emailsValue = computed(() => {
  const preferences = emailPreferences.value
  if (!preferences) return ''
  if (preferences.progress_report && preferences.reminders) return t('accountMenu.emailsOn')
  if (preferences.progress_report) return t('accountMenu.emailsReportsOnly')
  if (preferences.reminders) return t('accountMenu.emailsRemindersOnly')
  return t('accountMenu.emailsOff')
})
const emailsNote = computed(() => {
  const address = currentUser.profile?.email
  return address ? t('accountMenu.emailsNoteWithAddress', { address }) : t('accountMenu.emailsNote')
})

const PREFERENCES: ThemePreference[] = ['system', 'light', 'dark']
function isPreference(value: string): value is ThemePreference {
  return (PREFERENCES as string[]).includes(value)
}
const appearance = computed<string>({
  get: () => themeStore.preference,
  set: (value) => {
    if (isPreference(value)) themeStore.setPreference(value)
  },
})
const appearanceOptions = computed(() => PREFERENCES.map((value) => ({ value, label: t(`accountMenu.${value}`) })))

// A menu, not a task: on wider screens it opens next to the avatar — below it, or above it when
// the avatar sits low (the foot of a rail) — and on the side of the screen the avatar is on.
function place() {
  const rect = trigger.value?.getBoundingClientRect()
  if (!rect) return
  position.value = anchoredPosition(rect, { width: window.innerWidth, height: window.innerHeight })
}

function show() {
  view.value = 'main'
  place()
  open.value = true
}

function close() {
  open.value = false
}

function chooseLanguage(code: SupportedLocale) {
  void currentUser.setLocale(code)
  view.value = 'main'
}

function setEmailPreference(preference: EmailPreference, on: boolean) {
  void currentUser.setEmailPreference(preference, on)
}

// A link that leads to a view of this menu (the email settings link) asks for it; the request
// waits for the profile, which holds the email settings. Taken once mounted, so a menu anchored
// to the avatar has the avatar to anchor to.
const menuRequest = useAccountMenuRequest()
function takeMenuRequest() {
  if (menuRequest.pending.value === null || emailPreferences.value === undefined) return
  const requested = menuRequest.take()
  if (requested === 'emails') {
    show()
    view.value = 'emails'
  }
}
onMounted(takeMenuRequest)
watch([menuRequest.pending, emailPreferences], takeMenuRequest)
</script>

<template>
  <div>
    <button
      ref="trigger"
      type="button"
      data-test="account-menu-avatar"
      :aria-label="t('appBar.accountMenuAriaLabel')"
      aria-haspopup="dialog"
      :aria-expanded="open ? 'true' : 'false'"
      :class="
        entry === 'row'
          ? 'flex min-h-12 w-full items-center gap-3 rounded-full px-3 text-sm font-medium text-ink hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus'
          : 'flex h-12 w-12 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus'
      "
      @click="show"
    >
      <template v-if="entry === 'row'">
        <CircleUserRound :size="22" class="shrink-0 text-ink-muted" aria-hidden="true" />
        {{ t('accountMenu.label') }}
      </template>
      <UserAvatar v-else :initial="displayInitial" />
    </button>

    <OverlayLayer
      :open="open"
      :placement="isCompact ? 'bottom' : 'none'"
      :scrim="isCompact ? 'dim' : 'clear'"
      @close="close"
    >
      <div
        data-test="account-menu"
        :data-presentation="isCompact ? 'sheet' : 'menu'"
        role="dialog"
        aria-modal="true"
        :aria-label="t('accountMenu.label')"
        class="flex flex-col bg-surface-raised"
        :class="
          isCompact
            ? 'max-h-[90vh] w-full overflow-y-auto rounded-t-xl pb-safe shadow-level3'
            : 'fixed w-[18rem] rounded-lg border border-border py-1 shadow-level2'
        "
        :style="isCompact ? undefined : position"
      >
        <template v-if="view === 'main'">
          <div v-if="isCompact" class="mx-auto mt-2 h-1 w-9 rounded-full bg-border" aria-hidden="true" />
          <div data-test="account-identity" class="flex items-center gap-3 px-4 pb-2 pt-3">
            <UserAvatar :initial="displayInitial" :size="isCompact ? 'md' : 'sm'" />
            <div class="min-w-0">
              <p class="truncate text-base font-semibold text-ink">{{ currentUser.profile?.display_name }}</p>
              <p v-if="subline" class="truncate text-sm text-ink-muted">{{ subline }}</p>
            </div>
          </div>

          <p class="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {{ t('accountMenu.appearance') }}
          </p>
          <div class="px-4 pb-2">
            <SegmentedControl
              v-model="appearance"
              :label="t('accountMenu.appearance')"
              :options="appearanceOptions"
              test-id-prefix="appearance"
            />
          </div>

          <MenuRow
            data-test="account-language"
            :icon="Languages"
            :label="t('accountMenu.language')"
            :value="t(SHORT_LANGUAGE[currentUser.locale])"
            chevron
            @click="view = 'language'"
          />
          <!-- Every role: teachers and admins learn too, and get the same emails once they do. -->
          <MenuRow
            v-if="emailPreferences"
            data-test="account-emails"
            :icon="Mail"
            :label="t('accountMenu.emails')"
            :value="emailsValue"
            chevron
            @click="view = 'emails'"
          />
          <MenuRow
            v-if="inTeach"
            data-test="account-back-to-learning"
            :icon="GraduationCap"
            :label="t('accountMenu.backToLearning')"
            :to="{ name: 'home' }"
            @click="close"
          />
          <MenuRow
            v-else-if="canTeach"
            data-test="account-teach"
            :icon="PencilRuler"
            :label="t('accountMenu.teach')"
            :value="t('accountMenu.teachValue')"
            chevron
            :to="{ name: 'teach' }"
            @click="close"
          />
          <div class="my-1 h-px bg-border" />
          <MenuRow data-test="sign-out" :icon="LogOut" :label="t('buttons.signOut')" @click="signOut()" />
        </template>

        <template v-else-if="view === 'emails'">
          <SheetHeader
            :kind="isCompact ? 'sheet' : 'dialog'"
            :title="t('accountMenu.emails')"
            :title-id="emailsTitleId"
            back
            @back="view = 'main'"
          />
          <div v-if="emailPreferences" role="group" :aria-labelledby="emailsTitleId" class="flex flex-col pt-2">
            <SwitchRow
              v-for="emailSwitch in EMAIL_SWITCHES"
              :key="emailSwitch.preference"
              :data-test="`email-switch-${emailSwitch.preference}`"
              :label="t(emailSwitch.labelKey)"
              :description="t(emailSwitch.descriptionKey)"
              :model-value="emailPreferences[emailSwitch.preference]"
              @update:model-value="setEmailPreference(emailSwitch.preference, $event)"
            />
          </div>
          <p class="px-[1.25rem] pb-5 pt-3 text-xs text-ink-muted">{{ emailsNote }}</p>
        </template>

        <template v-else>
          <SheetHeader
            :kind="isCompact ? 'sheet' : 'dialog'"
            :title="t('accountMenu.language')"
            :title-id="languageTitleId"
            back
            @back="view = 'main'"
          />
          <div role="radiogroup" :aria-labelledby="languageTitleId" class="flex flex-col pt-1">
            <button
              v-for="language in LANGUAGES"
              :key="language.code"
              type="button"
              role="radio"
              :data-test="`language-option-${language.code}`"
              :aria-checked="currentUser.locale === language.code ? 'true' : 'false'"
              class="flex min-h-12 items-center justify-between px-4 text-left text-base focus-visible:bg-surface-sunken focus-visible:outline-none"
              :class="
                currentUser.locale === language.code
                  ? 'bg-accent-muted font-semibold text-accent-text'
                  : 'text-ink hover:bg-surface-sunken'
              "
              @click="chooseLanguage(language.code)"
            >
              {{ t(language.labelKey) }}
              <Check v-if="currentUser.locale === language.code" :size="20" aria-hidden="true" />
            </button>
          </div>
          <p class="px-4 pb-4 pt-3 text-xs text-ink-muted">{{ t('accountMenu.languageNote') }}</p>
        </template>
      </div>
    </OverlayLayer>
  </div>
</template>
