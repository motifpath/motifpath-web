import type { MessageKey } from '@/i18n'

const LANGUAGE_LABEL_KEYS: Record<string, MessageKey> = {
  en: 'languages.en',
  pt_BR: 'languages.pt_BR',
}

/** The message key naming the language with Language.code `code`, or null for one this UI doesn't know. */
export function languageLabelKey(code: string): MessageKey | null {
  return LANGUAGE_LABEL_KEYS[code] ?? null
}
