import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import CreditsView from '@/shared/components/CreditsView.vue'
import { clearVoiceCache } from '@/shared/composables/useListVoices'
import type { components } from '@/api/generated/core-domain'

type Voice = components['schemas']['Voice']

const ok = <T>(data: T) => Promise.resolve({ data, error: undefined, response: { status: 200 } })
const fail = () => Promise.resolve({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

const VOICES: Voice[] = [
  {
    voice_id: 'acoustic-guitar',
    names: { en: 'Acoustic guitar', pt_BR: 'Violão' },
    languages: ['en', 'pt_BR'],
    family: 'fretted',
    samples: [],
    attribution: 'Guitar samples by Someone, CC BY 3.0',
  },
  {
    voice_id: 'piano',
    names: { en: 'Piano' },
    languages: ['en'],
    family: 'keyboard',
    samples: [],
    attribution: 'Piano samples by Someone Else, CC BY 3.0',
  },
]

beforeEach(() => {
  GET.mockReset()
  clearVoiceCache()
})

describe('CreditsView', () => {
  it('credits every voice by its name, with the attribution its license asks for', async () => {
    GET.mockImplementation(() => ok(VOICES))
    const wrapper = mount(CreditsView)
    await flushPromises()

    const items = wrapper.findAll('[data-test="credits-voice"]')
    expect(items).toHaveLength(2)
    expect(items[0]!.text()).toContain('Acoustic guitar')
    expect(items[0]!.text()).toContain('Guitar samples by Someone, CC BY 3.0')
    expect(items[1]!.text()).toContain('Piano samples by Someone Else, CC BY 3.0')
  })

  it('shows loading, then an error that can be retried', async () => {
    GET.mockImplementation(() => fail())
    const wrapper = mount(CreditsView)
    expect(wrapper.find('[data-test="loading"]').exists()).toBe(true)
    await flushPromises()

    expect(wrapper.find('[data-test="error"]').exists()).toBe(true)

    GET.mockImplementation(() => ok(VOICES))
    await wrapper.get('[data-test="error"] button').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-test="credits-voice"]')).toHaveLength(2)
  })
})
