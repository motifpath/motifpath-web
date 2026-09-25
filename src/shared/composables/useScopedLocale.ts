import { computed, hasInjectionContext, inject, provide, type ComputedRef, type InjectionKey, type Ref } from 'vue'

import { i18n, type SupportedLocale } from '@/i18n'

const SCOPED_LOCALE: InjectionKey<Ref<SupportedLocale>> = Symbol('scopedLocale')

/** Makes every component below the caller translate in `locale` instead of the UI locale. */
export function provideScopedLocale(locale: Ref<SupportedLocale>): void {
  provide(SCOPED_LOCALE, locale)
}

export interface LocaleOverride {
  /** Translate in this locale, e.g. in the component that provides a scope and so can't inject it. */
  locale?: Ref<SupportedLocale>
}

/**
 * The locale text should be shown in: `override.locale` if given, else the
 * nearest `LocaleScope`'s, else the UI locale. Outside a component's setup
 * there is no scope to inject, so it follows the UI locale.
 */
export function useScopedLocale(override: LocaleOverride = {}): ComputedRef<SupportedLocale> {
  const scoped = override.locale ?? (hasInjectionContext() ? inject(SCOPED_LOCALE, null) : null)
  return computed(() => scoped?.value ?? i18n.global.locale.value)
}
