import { useApiList } from '@/shared/composables/useApiList'
import type { components } from '@/api/generated/core-domain'

type Instrument = components['schemas']['Instrument']

export function useListInstruments() {
  const { items: instruments, isLoading, error, retry } = useApiList<Instrument>((coreApi) =>
    coreApi.GET('/instruments', {}),
  )

  return { instruments, isLoading, error, retry }
}
