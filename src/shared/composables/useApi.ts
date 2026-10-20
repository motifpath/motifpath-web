import { coreApi, eventApi } from '@/api'

/**
 * The only component-facing entry point to the backend. Components and stores
 * call `useApi()` rather than importing the generated clients directly.
 */
export function useApi() {
  return { coreApi, eventApi }
}
