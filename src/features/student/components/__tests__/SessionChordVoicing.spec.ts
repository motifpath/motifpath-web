import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import SessionChordVoicing from '@/features/student/components/SessionChordVoicing.vue'
import { clearEmbeddedDiagramCache } from '@/shared/composables/useEmbeddedDiagram'
import { drillGuitar, drillVoicings } from '@/shared/testUtils/drill'
import type { components } from '@/api/generated/core-domain'

type Item = components['schemas']['PracticeSessionItem']

const ok = <T>(data: T) => Promise.resolve({ data, error: undefined, response: { status: 200 } })
const fail = () => Promise.resolve({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

const AM = drillVoicings.Am.diagram.diagram_id

function serve(options: { failing?: boolean } = {}) {
  GET.mockImplementation((path: string) => {
    if (path === '/instruments') return ok([{ ...drillGuitar, instrument_id: drillVoicings.Am.diagram.instrument_id }])
    if (options.failing) return fail()
    return ok({ ...drillVoicings.Am.diagram, chord_voicing: drillVoicings.Am.voicing })
  })
}

const base = { rung: 'play_clean', reason: 'new', node_id: null, level: 'new', estimated_seconds: 20 } as const

const voicing: Item = { ...base, item_key: `chord_voicing:${AM}`, kind: 'chord_voicing', chord_voicing: { diagram_id: AM, chord_symbol: 'Am' } }


function mountItem(item: Item, props: Record<string, unknown> = {}) {
  return mount(SessionChordVoicing, { props: { item, ...props }, attachTo: document.body })
}

describe('SessionChordVoicing', () => {
  beforeEach(() => {
    clearEmbeddedDiagramCache()
    GET.mockReset()
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('shows a single chord’s box, named, and how to play it', async () => {
    serve()
    const wrapper = mountItem(voicing)
    await flushPromises()

    expect(wrapper.get('[data-test="item-title"]').text()).toBe('Play Am clean')
    expect(wrapper.get('[data-test="chord-hint"]').text()).toBe('Fret it, strum once and let it ring.')
    expect(wrapper.get('[data-test="chord-box"] svg').attributes('aria-label')).toBe('Am')
  })

  it('is answered by a self-rating of the chord', async () => {
    serve()
    const wrapper = mountItem(voicing)
    await flushPromises()

    expect(wrapper.get('[data-test="rate-prompt"]').text()).toBe('How did Am sound?')
    await wrapper.get('[data-test="rate-almost"]').trigger('click')

    expect(wrapper.emitted('rate')).toEqual([['almost']])
  })

  it('can only be skipped, as unavailable, when its chord can’t be drawn', async () => {
    serve({ failing: true })
    const wrapper = mountItem(voicing)
    await flushPromises()

    expect(wrapper.find('[data-test="self-rating"]').exists()).toBe(false)
    await wrapper.get('[data-test="skip-item"]').trigger('click')

    expect(wrapper.emitted('skip')).toEqual([['unavailable']])
  })

  it('names the instrument in a session mixing instruments', async () => {
    serve()
    const wrapper = mountItem(voicing, { instrumentName: 'Guitar' })
    await flushPromises()

    expect(wrapper.get('[data-test="item-instrument"]').text()).toBe('Guitar')
  })
})
