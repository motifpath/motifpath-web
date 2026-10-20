import { i18n } from '@/i18n'

interface LocaleModule {
  default: Record<string, unknown>
}

/**
 * Builds a memoized loader that merges a feature's `en`/`pt-BR` locale
 * messages into the global i18n instance the first time it's called, and
 * reuses the same in-flight or settled promise on every call after that.
 * Each feature passes its own `import('./en.json')`/`import('./pt-BR.json')`
 * closures so the dynamic import specifiers stay literal at each call site
 * (required for the bundler to code-split them into separate chunks).
 */
export function createLocaleLoader(
  loadEn: () => Promise<LocaleModule>,
  loadPtBr: () => Promise<LocaleModule>,
): () => Promise<void> {
  let loaded: Promise<void> | null = null

  return function ensureLocaleLoaded(): Promise<void> {
    if (!loaded) {
      loaded = Promise.all([loadEn(), loadPtBr()])
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
}
