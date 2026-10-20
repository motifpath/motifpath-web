import { createLocaleLoader } from '@/shared/utils/createLocaleLoader'

export const ensureStudentLocaleLoaded = createLocaleLoader(
  () => import('./en.json'),
  () => import('./pt-BR.json'),
)
