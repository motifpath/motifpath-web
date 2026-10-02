import { createLocaleLoader } from '@/shared/utils/createLocaleLoader'

export const ensureAdminLocaleLoaded = createLocaleLoader(
  () => import('./en.json'),
  () => import('./pt-BR.json'),
)
