import { createLocaleLoader } from '@/shared/utils/createLocaleLoader'

export const ensureAuthLocaleLoaded = createLocaleLoader(
  () => import('./en.json'),
  () => import('./pt-BR.json'),
)
