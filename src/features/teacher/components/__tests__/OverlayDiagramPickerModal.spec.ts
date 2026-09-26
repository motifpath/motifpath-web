import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import OverlayDiagramPickerModal from '@/features/teacher/components/OverlayDiagramPickerModal.vue'
import { makeFrettedDiagram } from '@/shared/testUtils/diagram'

function page(items: unknown[], total = items.length) {
  return { data: { items, total, limit: 20, offset: 0 }, error: undefined, response: { status: 200 } }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

const pentatonic = makeFrettedDiagram({ diagram_id: 'd-penta', names: { en: 'A minor pentatonic' } })
const major = makeFrettedDiagram({ diagram_id: 'd-major', names: { en: 'C major scale' }, kind: 'basic' })
const base = makeFrettedDiagram({ diagram_id: 'd-base', names: { en: 'The one being edited' } })

function mountPicker(props: { excludeIds?: string[] } = {}) {
  return mount(OverlayDiagramPickerModal, {
    props: { instrumentId: 'instrument-guitar', excludeIds: [], ...props },
  })
}

type Picker = ReturnType<typeof mountPicker>

function rowTexts(wrapper: Picker): string[] {
  return wrapper.findAll('[data-test="overlay-option-name"]').map((name) => name.text())
}

describe('OverlayDiagramPickerModal', () => {
  beforeEach(() => {
    GET.mockReset()
  })

  it('lists only diagrams of the same instrument, marking templates', async () => {
    GET.mockResolvedValueOnce(page([pentatonic, major]))
    const wrapper = mountPicker()
    await flush()

    expect(GET).toHaveBeenCalledWith('/diagrams', {
      params: { query: expect.objectContaining({ instrument_id: 'instrument-guitar' }) },
    })
    expect(rowTexts(wrapper)).toEqual(['A minor pentatonic', 'C major scale'])
    const badges = wrapper.findAll('[data-test="overlay-option"]').map((row) => row.find('[data-test="template-badge"]').exists())
    expect(badges).toEqual([false, true])
  })

  it('leaves out the diagram being edited and those already overlaid', async () => {
    GET.mockResolvedValueOnce(page([base, pentatonic, major]))
    const wrapper = mountPicker({ excludeIds: ['d-base', 'd-major'] })
    await flush()

    expect(rowTexts(wrapper)).toEqual(['A minor pentatonic'])
  })

  it('picks a diagram', async () => {
    GET.mockResolvedValueOnce(page([pentatonic]))
    const wrapper = mountPicker()
    await flush()

    await wrapper.get('[data-test="overlay-option"]').trigger('click')

    expect(wrapper.emitted('select')).toEqual([[pentatonic]])
  })

  it('shows a loading state while fetching', () => {
    GET.mockReturnValueOnce(new Promise(() => {}))
    const wrapper = mountPicker()

    expect(wrapper.find('[data-test="overlay-picker-loading"]').exists()).toBe(true)
  })

  it('shows an error with a retry that loads again', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })
    const wrapper = mountPicker()
    await flush()

    GET.mockResolvedValueOnce(page([pentatonic]))
    await wrapper.get('[data-test="overlay-picker-error"] [data-test="retry"]').trigger('click')
    await flush()

    expect(GET).toHaveBeenCalledTimes(2)
    expect(rowTexts(wrapper)).toEqual(['A minor pentatonic'])
  })

  it('says when there is nothing to overlay', async () => {
    GET.mockResolvedValueOnce(page([base]))
    const wrapper = mountPicker({ excludeIds: ['d-base'] })
    await flush()

    expect(wrapper.find('[data-test="overlay-picker-empty"]').exists()).toBe(true)
  })

  it('still offers more when the loaded page holds only diagrams it leaves out', async () => {
    GET.mockResolvedValueOnce(page([base], 2))
    const wrapper = mountPicker({ excludeIds: ['d-base'] })
    await flush()

    expect(wrapper.find('[data-test="overlay-picker-empty"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="load-more"]').exists()).toBe(true)
  })

  it('loads more diagrams on request', async () => {
    GET.mockResolvedValueOnce(page([pentatonic], 2))
    const wrapper = mountPicker()
    await flush()

    GET.mockResolvedValueOnce(page([major], 2))
    await wrapper.get('[data-test="load-more"]').trigger('click')
    await flush()

    expect(rowTexts(wrapper)).toHaveLength(2)
  })

  it('closes', async () => {
    GET.mockResolvedValueOnce(page([]))
    const wrapper = mountPicker()
    await flush()

    await wrapper.get('[data-test="close-modal"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
