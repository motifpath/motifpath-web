import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { clearVoiceCache, useListVoices } from '@/shared/composables/useListVoices'

const VOICES = [{ voice_id: 'acoustic-guitar', names: { en: 'Acoustic guitar' }, family: 'fretted', samples: [] }]

describe('useListVoices', () => {
  beforeEach(() => {
    GET.mockReset()
    clearVoiceCache()
  })

  it('loads the voices on creation', async () => {
    GET.mockResolvedValueOnce({ data: VOICES, error: undefined, response: { status: 200 } })

    const { voices, isLoading, error } = useListVoices()
    expect(isLoading.value).toBe(true)
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/voices', {})
    expect(voices.value).toEqual(VOICES)
    expect(error.value).toBe(false)
  })

  it('asks once per page: every later list reuses the loaded voices', async () => {
    GET.mockResolvedValue({ data: VOICES, error: undefined, response: { status: 200 } })
    const first = useListVoices()
    await vi.waitFor(() => expect(first.isLoading.value).toBe(false))

    const later = useListVoices()
    await vi.waitFor(() => expect(later.isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledTimes(1)
    expect(later.voices.value).toEqual(VOICES)
  })

  it('forgets a failed load, so the next list asks again', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })
    const failed = useListVoices()
    await vi.waitFor(() => expect(failed.isLoading.value).toBe(false))
    expect(failed.error.value).toBe(true)

    GET.mockResolvedValueOnce({ data: VOICES, error: undefined, response: { status: 200 } })
    const retried = useListVoices()
    await vi.waitFor(() => expect(retried.isLoading.value).toBe(false))
    expect(retried.voices.value).toEqual(VOICES)
  })
})
