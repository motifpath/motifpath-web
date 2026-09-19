import { i18n } from '@/i18n'

let loaded: Promise<void> | null = null

/**
 * Lazily merges this feature's locale messages into the global i18n
 * instance, once, the first time any auth route is entered. Subsequent
 * entries reuse the same in-flight or settled promise instead of importing
 * again.
 */
export function ensureAuthLocaleLoaded(): Promise<void> {
  if (!loaded) {
    loaded = Promise.all([import('./en.json'), import('./pt-BR.json')])
      .then(([en, ptBr]) => {
        i18n.global.mergeLocaleMessage('en', en.default)
        i18n.global.mergeLocaleMessage('pt-BR', ptBr.default)
      })
      .catch((error: unknown) => {
        // Don't cache a failed attempt — a transient chunk-load failure
        // (flaky network) would otherwise permanently break locale loading
        // for every future navigation this session, with no retry path
        // short of a full page reload.
        loaded = null
        throw error
      })
  }

  return loaded
}
