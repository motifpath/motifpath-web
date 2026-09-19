import { createI18n } from 'vue-i18n'

import sharedEn from '@/shared/locales/en.json'
import sharedPtBr from '@/shared/locales/pt-BR.json'
import type StudentMessageSchema from '@/features/student/locales/en.json'

/**
 * The canonical shape every locale's messages must match, derived from each
 * feature's `en.json` (the canonical locale). This is a type-only reference
 * to each feature's locale file, so it costs nothing at runtime — the actual
 * messages still arrive lazily via `mergeLocaleMessage` when a feature's
 * routes are entered (see `src/features/student/locales/index.ts`).
 *
 * When a new feature grows its own `locales/en.json`, add it to this
 * intersection so `t()` calls stay typed against the full merged schema.
 */
export type MessageSchema = typeof sharedEn & typeof StudentMessageSchema

declare module 'vue-i18n' {
  // Module augmentation requires an interface here — this mirrors vue-i18n's
  // own documented pattern for typed locale messages.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefineLocaleMessage extends MessageSchema {}
}

type Leaf = string | number | boolean

/**
 * Every dot-separated path to a leaf string in `MessageSchema`, e.g.
 * `'buttons.save'` or `'pathStep.status.completed'`. This is what makes an
 * unknown key a compile error in `useTypedT()` calls, rather than only an
 * editor suggestion.
 */
export type MessageKey<T = MessageSchema> = {
  [K in keyof T & string]: T[K] extends Leaf ? K : `${K}.${MessageKey<T[K]>}`
}[keyof T & string]

export const SUPPORTED_LOCALES = ['en', 'pt-BR'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const i18n = createI18n<MessageSchema, SupportedLocale, false>({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: sharedEn,
    'pt-BR': sharedPtBr,
  },
})

// core-domain's Language.code uses underscore-separated tags (e.g. "pt_BR"),
// while the UI locale follows the hyphenated BCP-47 form vue-i18n and
// `SUPPORTED_LOCALES` already use (e.g. "pt-BR"). This is the one place that
// translates between the two, so no other module needs to know both forms exist.
const API_LANGUAGE_CODES: Record<SupportedLocale, string> = {
  en: 'en',
  'pt-BR': 'pt_BR',
}

/** Converts a supported UI locale to the Language.code the core-domain API expects. */
export function toApiLanguageCode(locale: SupportedLocale): string {
  return API_LANGUAGE_CODES[locale]
}

/**
 * Converts a core-domain Language.code back to a supported UI locale,
 * defaulting to the fallback locale for any code this UI doesn't have a
 * translation for yet.
 */
export function fromApiLanguageCode(code: string): SupportedLocale {
  const match = (Object.entries(API_LANGUAGE_CODES) as [SupportedLocale, string][]).find(
    ([, apiCode]) => apiCode === code,
  )
  return match?.[0] ?? 'en'
}
