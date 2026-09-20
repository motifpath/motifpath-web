import { createLocaleLoader } from '@/shared/utils/createLocaleLoader'

export const ensureTeacherLocaleLoaded = createLocaleLoader(
  () => import('./en.json'),
  () => import('./pt-BR.json'),
)
