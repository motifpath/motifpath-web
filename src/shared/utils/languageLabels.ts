import type { MessageKey } from '@/i18n'

const LANGUAGE_LABEL_KEYS: Record<string, MessageKey> = {
  en: 'languages.en',
  pt_BR: 'languages.pt_BR',
}

/** The message key naming the language with Language.code `code`, or null for one this UI doesn't know. */
export function languageLabelKey(code: string): MessageKey | null {
  return LANGUAGE_LABEL_KEYS[code] ?? null
}

export interface LanguageBadge {
  flag: string
  shortCode: string
}

const LANGUAGE_BADGES: Record<string, LanguageBadge> = {
  en: { flag: '🇺🇸', shortCode: 'EN' },
  pt_BR: { flag: '🇧🇷', shortCode: 'PT' },
}

/** The flag and short code tagging the language with Language.code `code`; no flag for one this UI doesn't know. */
export function languageBadge(code: string): LanguageBadge {
  return LANGUAGE_BADGES[code] ?? { flag: '', shortCode: code.toUpperCase() }
}
