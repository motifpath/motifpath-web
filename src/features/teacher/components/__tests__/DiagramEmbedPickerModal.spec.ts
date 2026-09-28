import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import DiagramEmbedPicker from '@/features/teacher/components/DiagramEmbedPicker.vue'
import DiagramEmbedPickerModal from '@/features/teacher/components/DiagramEmbedPickerModal.vue'
import { clearEmbeddedDiagramCache } from '@/shared/composables/useEmbeddedDiagram'
import { makeFrettedDiagram, makeFrettedInstrument } from '@/shared/testUtils/diagram'
import type { components } from '@/api/generated/core-domain'

type DiagramRef = components['schemas']['DiagramRef']

const ok = <T>(data: T) => Promise.resolve({ data, error: undefined, response: { status: 200 } })
const penta = makeFrettedDiagram({ diagram_id: 'd-penta' })
const chosen: DiagramRef = { diagram_id: 'd-penta', layers: { intervals: true, subset: null } }

function mountModal(props: { open?: boolean; initial?: DiagramRef | null; editing?: boolean } = {}) {
  return mount(DiagramEmbedPickerModal, {
    props: { open: true, initial: null, editing: false, ...props },
    global: { stubs: { teleport: true } },
  })
}

beforeEach(() => {
  GET.mockReset()
  clearEmbeddedDiagramCache()
  GET.mockImplementation((path: string) => {
    if (path === '/instruments') return ok([makeFrettedInstrument()])
    if (path === '/diagrams') return ok({ items: [penta], total: 1, limit: 20, offset: 0 })
    return ok(penta)
  })
})

describe('DiagramEmbedPickerModal', () => {
  it('renders nothing while closed', () => {
    const wrapper = mountModal({ open: false })

    expect(wrapper.findComponent(DiagramEmbedPicker).exists()).toBe(false)
  })

  it('titles itself for inserting a new diagram, with Insert disabled until one is chosen', async () => {
    const wrapper = mountModal()
    await flushPromises()

    expect(wrapper.get('[data-test="embed-picker-title"]').text()).toBe('Insert a diagram')
    expect(wrapper.get('[data-test="embed-picker-apply"]').attributes('disabled')).toBeDefined()
  })

  it('applies the chosen ref', async () => {
    const wrapper = mountModal()
    await flushPromises()
    await wrapper.get('[data-test="diagram-option"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-test="embed-picker-apply"]').trigger('click')

    expect(wrapper.emitted('apply')).toEqual([[chosen]])
  })

  it('titles itself for editing an embedded diagram', async () => {
    const wrapper = mountModal({ initial: chosen, editing: true })
    await flushPromises()

    expect(wrapper.get('[data-test="embed-picker-title"]').text()).toBe('Edit diagram')
    expect(wrapper.get('[data-test="embed-picker-apply"]').text()).toBe('Apply')
  })

  it('titles itself for editing even when the embedded diagram can’t be reopened, like a stack', async () => {
    const wrapper = mountModal({ initial: null, editing: true })
    await flushPromises()

    expect(wrapper.get('[data-test="embed-picker-title"]').text()).toBe('Edit diagram')
  })

  it('closes on cancel without applying', async () => {
    const wrapper = mountModal()
    await flushPromises()

    await wrapper.get('[data-test="embed-picker-cancel"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('apply')).toBeUndefined()
  })
})
