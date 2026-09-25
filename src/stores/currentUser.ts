import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import { useToast } from '@/shared/composables/useToast'
import type { components } from '@/api/generated/core-domain'
import { i18n, SUPPORTED_LOCALES, fromApiLanguageCode, toApiLanguageCode, type SupportedLocale } from '@/i18n'

type UserProfile = components['schemas']['UserProfile']

export type CurrentUserState = 'idle' | 'registering' | 'registered' | 'failed'

/**
 * Why registration failed, when the reason is one the user can fix
 * themselves: 'name-required' means their account has no name, which
 * registration requires. null for any other failure.
 */
export type RegistrationFailureReason = 'name-required' | null

const LOCALE_STORAGE_KEY = 'motifpath:locale'

function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

function persistedLocale(): SupportedLocale | null {
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
  return stored !== null && isSupportedLocale(stored) ? stored : null
}

/** Normalizes a BCP-47-ish browser language tag (e.g. "pt-BR", "pt", "en-US") to a supported locale, or null if this UI has no translation for it. */
function normalizeLanguageTag(tag: string): SupportedLocale | null {
  const lower = tag.toLowerCase()
  if (lower.startsWith('pt')) return 'pt-BR'
  if (lower.startsWith('en')) return 'en'
  return null
}

function browserLocale(): SupportedLocale | null {
  const candidates =
    window.navigator.languages && window.navigator.languages.length > 0
      ? window.navigator.languages
      : [window.navigator.language]

  for (const candidate of candidates) {
    const normalized = normalizeLanguageTag(candidate)
    if (normalized) return normalized
  }
  return null
}

function persistLocale(locale: SupportedLocale): void {
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
}

/**
 * A prior explicit choice (this device) wins; otherwise falls back to the
 * browser's language, then English. Exported so anything that needs to know
 * the visitor's locale before this store exists — Clerk's plugin options are
 * set once at `app.use()` time in `main.ts`, well before Pinia can be
 * queried — can resolve it the same way instead of duplicating the logic.
 */
export function resolveAnonymousLocale(): SupportedLocale {
  return persistedLocale() ?? browserLocale() ?? 'en'
}

/**
 * Registration refuses an account whose identity carries no name, reporting
 * it as a validation failure on field "name".
 */
function isMissingNameError(status: number | undefined, error: unknown): boolean {
  if (status !== 400 || typeof error !== 'object' || error === null || !('errors' in error)) return false
  const { errors } = error
  return Array.isArray(errors) && errors.some((e: unknown) => typeof e === 'object' && e !== null && 'field' in e && e.field === 'name')
}

/**
 * The authenticated Clerk identity's MotifPath registration state. Resolves the
 * caller's profile via `GET /users/me`, self-registering as a student on 404 and
 * reconciling a 409 race by re-reading the profile. `ensure()` is idempotent —
 * safe to call on every authenticated mount without duplicating requests.
 */
export const useCurrentUserStore = defineStore('currentUser', () => {
  const { coreApi } = useApi()
  const toast = useToast()

  const state = ref<CurrentUserState>('idle')
  const profile = ref<UserProfile | null>(null)
  const failureReason = ref<RegistrationFailureReason>(null)

  // Resolved once, at store creation, before any authenticated profile is
  // known — the same visitor-preference pattern as `theme.ts`. Overridden by
  // the registered profile's own locale in `applyIfRegistered`, and by any
  // explicit `setLocale()` call.
  i18n.global.locale.value = resolveAnonymousLocale()

  const isRegistered = computed(() => state.value === 'registered')
  const locale = computed<SupportedLocale>(() => i18n.global.locale.value)

  let inFlight: Promise<void> | null = null

  // Bumped by every setLocale() call — independent of `epoch`, which only
  // tracks registration attempts. Two overlapping setLocale() calls share
  // the same registration epoch, so without this a slower call's response
  // could resolve after a faster, later call's and silently overwrite it.
  let localeEpoch = 0

  // Bumped by every runRegistration() call and by reset(). An attempt checks
  // its own epoch against the current one before each write — if reset() (or
  // a newer attempt) ran while it was awaiting, its epoch is stale and it
  // must not apply its result, including clearing `inFlight` out from under
  // whichever newer attempt actually owns it.
  let epoch = 0

  // Shared by every await point in register(): stale (a reset() or a newer
  // attempt already moved epoch on) tells the caller to stop without
  // touching state; otherwise applies a successful profile and tells the
  // caller to stop, or reports "not resolved yet, keep going".
  function applyIfRegistered(myEpoch: number, data: UserProfile | undefined): boolean {
    if (myEpoch !== epoch) return true
    if (data) {
      profile.value = data
      state.value = 'registered'
      i18n.global.locale.value = fromApiLanguageCode(data.locale.code)
      return true
    }
    return false
  }

  async function register(myEpoch: number): Promise<void> {
    state.value = 'registering'
    failureReason.value = null

    // A network-level failure (unreachable core-domain, DNS, CORS preflight)
    // rejects rather than resolving with a {data,error,response} shape —
    // caught here so it lands on 'failed' like any other unsuccessful
    // outcome, instead of leaving state stuck at 'registering' forever.
    try {
      const me = await coreApi.GET('/users/me')
      if (applyIfRegistered(myEpoch, me.data)) return

      if (me.response?.status !== 404) {
        state.value = 'failed'
        return
      }

      const created = await coreApi.POST('/users', { body: { role: 'student' } })
      if (applyIfRegistered(myEpoch, created.data)) return

      if (created.response?.status === 409) {
        const reconciled = await coreApi.GET('/users/me')
        if (applyIfRegistered(myEpoch, reconciled.data)) return
      }

      if (isMissingNameError(created.response?.status, created.error)) {
        failureReason.value = 'name-required'
      }
      state.value = 'failed'
    } catch {
      if (myEpoch === epoch) {
        state.value = 'failed'
      }
    }
  }

  /** Starts a registration attempt, or returns the one already running. */
  function runRegistration(): Promise<void> {
    if (state.value === 'registering') {
      return inFlight ?? Promise.resolve()
    }

    const myEpoch = ++epoch
    const attempt = register(myEpoch).finally(() => {
      // Only clear the slot if it's still this attempt's — a reset() or a
      // newer attempt may have already moved epoch on and replaced it.
      if (myEpoch === epoch) {
        inFlight = null
      }
    })
    inFlight = attempt
    return attempt
  }

  function ensure(): Promise<void> {
    // 'failed' is a terminal outcome only retry() may re-run — ensure() is
    // called defensively and on every sign-in, and must never turn either
    // of those into a silent, un-asked-for retry of a real failure.
    if (state.value === 'registered' || state.value === 'failed') {
      return Promise.resolve()
    }
    return runRegistration()
  }

  function retry(): Promise<void> {
    return runRegistration()
  }

  function reset(): void {
    epoch++
    state.value = 'idle'
    profile.value = null
    failureReason.value = null
    inFlight = null
  }

  /**
   * Switches the UI locale immediately (optimistic), persists it as the
   * anonymous/offline fallback, and — once registered — confirms it with the
   * server. A failed server update reverts the optimistic change and surfaces
   * a toast, consistent with never leaving the UI showing a locale the server
   * didn't actually accept.
   */
  async function setLocale(newLocale: SupportedLocale): Promise<void> {
    const previousLocale = i18n.global.locale.value
    i18n.global.locale.value = newLocale
    persistLocale(newLocale)

    const myLocaleEpoch = ++localeEpoch

    if (state.value !== 'registered') {
      return
    }

    const myEpoch = epoch
    try {
      const updated = await coreApi.PATCH('/users/me', {
        body: { locale: toApiLanguageCode(newLocale) },
      })
      // A reset() (sign-out) or a newer registration attempt moved `epoch`
      // on, or a later setLocale() call moved `localeEpoch` on, while this
      // request was in flight — either way its result is stale and must not
      // touch locale/profile state.
      if (myEpoch !== epoch || myLocaleEpoch !== localeEpoch) return

      if (updated.data) {
        profile.value = updated.data
        i18n.global.locale.value = fromApiLanguageCode(updated.data.locale.code)
        return
      }

      i18n.global.locale.value = previousLocale
      persistLocale(previousLocale)
      toast.error(i18n.global.t('errors.localeUpdateFailed'))
    } catch {
      if (myEpoch !== epoch || myLocaleEpoch !== localeEpoch) return
      i18n.global.locale.value = previousLocale
      persistLocale(previousLocale)
      toast.error(i18n.global.t('errors.localeUpdateFailed'))
    }
  }

  return { state, profile, failureReason, isRegistered, locale, ensure, retry, reset, setLocale }
})
