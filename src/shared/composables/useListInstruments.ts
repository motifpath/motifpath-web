import type { useApi } from '@/shared/composables/useApi'
import { useApiList } from '@/shared/composables/useApiList'
import type { components } from '@/api/generated/core-domain'

type Instrument = components['schemas']['Instrument']
type CoreApi = ReturnType<typeof useApi>['coreApi']
type InstrumentsResult = { data?: Instrument[]; error?: unknown }

// Several controls on one page each list the instruments; lists set up
// while a request is still in flight share it rather than each asking
// again. Nothing is kept once it settles, so a later list is never stale.
let inFlight: Promise<InstrumentsResult> | null = null

function fetchInstruments(coreApi: CoreApi): Promise<InstrumentsResult> {
  if (!inFlight) {
    inFlight = coreApi.GET('/instruments', {}).finally(() => {
      inFlight = null
    })
  }
  return inFlight
}

export function useListInstruments() {
  const { items: instruments, isLoading, error, retry } = useApiList<Instrument>(fetchInstruments)

  return { instruments, isLoading, error, retry }
}
