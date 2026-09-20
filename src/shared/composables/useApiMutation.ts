import { useApi } from '@/shared/composables/useApi'
import { describeApiError } from '@/shared/utils/apiError'

type CoreApi = ReturnType<typeof useApi>['coreApi']

/**
 * Generic factory for a "POST/PUT and return the created/updated resource"
 * composable. `perform` makes the actual typed openapi-fetch call so callers
 * keep full path/body/response type-checking — this only centralizes the
 * shared "no data means throw a described error" contract every mutation
 * composable in this codebase follows.
 */
export function useApiMutation<TArgs extends unknown[], TResponse>(
  perform: (coreApi: CoreApi, ...args: TArgs) => Promise<{ data?: TResponse; error?: unknown }>,
  errorMessage: string,
) {
  const { coreApi } = useApi()

  return async function mutate(...args: TArgs): Promise<TResponse> {
    const { data, error } = await perform(coreApi, ...args)
    if (data === undefined) {
      throw new Error(describeApiError(error, errorMessage))
    }
    return data
  }
}

/** Same contract as `useApiMutation`, for mutations with no response body (e.g. link/unlink, delete). */
export function useApiVoidMutation<TArgs extends unknown[]>(
  perform: (coreApi: CoreApi, ...args: TArgs) => Promise<{ error?: unknown }>,
  errorMessage: string,
) {
  const { coreApi } = useApi()

  return async function mutate(...args: TArgs): Promise<void> {
    const { error } = await perform(coreApi, ...args)
    if (error) {
      throw new Error(describeApiError(error, errorMessage))
    }
  }
}
