import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import DiagramEmbedPicker from '@/features/teacher/components/DiagramEmbedPicker.vue'
import EmbeddedDiagram from '@/shared/components/diagram/EmbeddedDiagram.vue'
import { clearEmbeddedDiagramCache } from '@/shared/composables/useEmbeddedDiagram'
import { makeFrettedDiagram, makeFrettedInstrument } from '@/shared/testUtils/diagram'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type DiagramRef = components['schemas']['DiagramRef']

const ok = <T>(data: T) => Promise.resolve({ data, error: undefined, response: { status: 200 } })
const fail = () => Promise.resolve({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

const penta = makeFrettedDiagram({ diagram_id: 'd-penta', names: { en: 'A minor pentatonic' } })
const piano = makeFrettedDiagram({ diagram_id: 'd-piano', names: { en: 'C major chord' }, instrument_id: 'instrument-piano' })
const guitar = makeFrettedInstrument()
const keyboard = makeFrettedInstrument({ instrument_id: 'instrument-piano', family: 'keyboard' })

let byId: Record<string, Diagram | 'fail'>

function serve(list: Diagram[]) {
  GET.mockImplementation((path: string, options?: { params?: { path?: { diagram_id?: string } } }) => {
    if (path === '/instruments') return ok([guitar, keyboard])
    if (path === '/diagrams') return ok({ items: list, total: list.length, limit: 20, offset: 0 })
    const found = byId[options?.params?.path?.diagram_id ?? '']
    return !found || found === 'fail' ? fail() : ok(found)
  })
}

function mountPicker(initial: DiagramRef | null = null, answers = false) {
  return mount(DiagramEmbedPicker, { props: { initial, answers } })
}

type Picker = ReturnType<typeof mountPicker>

function lastChange(wrapper: Picker): DiagramRef | null | undefined {
  return wrapper.emitted('change')?.at(-1)?.[0] as DiagramRef | null | undefined
}

function intervalBoxes(wrapper: Picker) {
  return wrapper.findAll('[data-test="embed-picker-interval"]')
}

async function choose(wrapper: Picker, index = 0) {
  await wrapper.findAll('[data-test="diagram-option"]')[index]!.trigger('click')
  await flushPromises()
}

beforeEach(() => {
  GET.mockReset()
  clearEmbeddedDiagramCache()
  byId = { 'd-penta': penta, 'd-piano': piano }
})

describe('DiagramEmbedPicker', () => {
  it('lists every diagram to choose from when nothing is embedded yet', async () => {
    serve([penta, piano])
    const wrapper = mountPicker()
    await flushPromises()

    expect(wrapper.findAll('[data-test="diagram-option"]')).toHaveLength(2)
    expect(wrapper.find('[data-test="embed-picker-config"]').exists()).toBe(false)
  })

  it('previews a chosen diagram with labels and every interval shown, and reports the ref', async () => {
    serve([penta])
    const wrapper = mountPicker()
    await flushPromises()
    await choose(wrapper)

    expect(wrapper.get('[data-test="embed-picker-name"]').text()).toBe('A minor pentatonic')
    expect((wrapper.get('[data-test="embed-picker-labels"]').element as HTMLInputElement).checked).toBe(true)
    expect(intervalBoxes(wrapper).map((box) => box.text())).toEqual(['R', 'b3', '4', '5', 'b7'])
    expect(wrapper.findComponent(EmbeddedDiagram).props('embed')).toEqual({
      kind: 'single',
      ref: { diagram_id: 'd-penta', layers: { intervals: true, subset: null } },
    })
    expect(lastChange(wrapper)).toEqual({ diagram_id: 'd-penta', layers: { intervals: true, subset: null } })
  })

  it('narrows the shown intervals and hides labels', async () => {
    serve([penta])
    const wrapper = mountPicker()
    await flushPromises()
    await choose(wrapper)

    await intervalBoxes(wrapper)[1]!.get('input').setValue(false)
    await wrapper.get('[data-test="embed-picker-labels"]').setValue(false)
    await flushPromises()

    expect(lastChange(wrapper)).toEqual({ diagram_id: 'd-penta', layers: { intervals: false, subset: ['R', '4', '5', 'b7'] } })
  })

  it('reports nothing, and says why, with every interval unchecked', async () => {
    serve([penta])
    const wrapper = mountPicker()
    await flushPromises()
    await choose(wrapper)

    for (const box of intervalBoxes(wrapper)) await box.get('input').setValue(false)
    await flushPromises()

    expect(lastChange(wrapper)).toBeNull()
    expect(wrapper.find('[data-test="embed-picker-no-intervals"]').exists()).toBe(true)
  })

  it('reports nothing for a diagram students can’t be shown yet, and says so', async () => {
    serve([piano])
    const wrapper = mountPicker()
    await flushPromises()
    await choose(wrapper)

    expect(wrapper.find('[data-test="embed-picker-unavailable"]').exists()).toBe(true)
    expect(lastChange(wrapper)).toBeNull()
  })

  it('goes back to the list to change the diagram', async () => {
    serve([penta])
    const wrapper = mountPicker()
    await flushPromises()
    await choose(wrapper)

    await wrapper.get('[data-test="embed-picker-change"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-test="diagram-option"]')).toHaveLength(1)
    expect(lastChange(wrapper)).toBeNull()
  })

  it('reopens an embedded diagram with its own settings', async () => {
    serve([])
    const wrapper = mountPicker({ diagram_id: 'd-penta', layers: { intervals: false, subset: ['R'] } })
    await flushPromises()

    expect(wrapper.find('[data-test="diagram-option"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="embed-picker-name"]').text()).toBe('A minor pentatonic')
    expect((wrapper.get('[data-test="embed-picker-labels"]').element as HTMLInputElement).checked).toBe(false)
    const checked = intervalBoxes(wrapper).map((box) => (box.get('input').element as HTMLInputElement).checked)
    expect(checked).toEqual([true, false, false, false, false])
    expect(lastChange(wrapper)).toEqual({ diagram_id: 'd-penta', layers: { intervals: false, subset: ['R'] } })
  })

  it('offers a retry, or another diagram, when the embedded one fails to load', async () => {
    byId['d-penta'] = 'fail'
    serve([piano])
    const wrapper = mountPicker({ diagram_id: 'd-penta', layers: { intervals: true } })
    await flushPromises()

    expect(wrapper.find('[data-test="embed-picker-load-error"]').exists()).toBe(true)

    byId['d-penta'] = penta
    await wrapper.get('[data-test="embed-picker-load-error"] [data-test="retry"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-test="embed-picker-name"]').text()).toBe('A minor pentatonic')
  })

  it('lets the teacher choose another diagram when the embedded one fails to load', async () => {
    byId['d-penta'] = 'fail'
    serve([piano])
    const wrapper = mountPicker({ diagram_id: 'd-penta', layers: { intervals: true } })
    await flushPromises()

    await wrapper.get('[data-test="embed-picker-choose-another"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-test="diagram-option"]')).toHaveLength(1)
  })

  describe('as an exercise stimulus', () => {
    function correctBoxes(wrapper: Picker) {
      return wrapper.findAll('[data-test="embed-picker-correct"]')
    }

    it('asks which of the shown intervals are correct, and reports nothing until one is', async () => {
      serve([penta])
      const wrapper = mountPicker(null, true)
      await flushPromises()
      await choose(wrapper)

      expect(correctBoxes(wrapper).map((box) => box.text())).toEqual(['R', 'b3', '4', '5', 'b7'])
      expect(wrapper.find('[data-test="embed-picker-no-correct"]').exists()).toBe(true)
      expect(lastChange(wrapper)).toBeNull()

      await correctBoxes(wrapper)[0]!.get('input').setValue(true)
      await flushPromises()

      expect(wrapper.find('[data-test="embed-picker-no-correct"]').exists()).toBe(false)
      expect(lastChange(wrapper)).toEqual({
        diagram_id: 'd-penta',
        layers: { intervals: true, subset: null },
        correct_intervals: ['R'],
      })
    })

    it('offers only the intervals still shown as answers', async () => {
      serve([penta])
      const wrapper = mountPicker(null, true)
      await flushPromises()
      await choose(wrapper)

      await intervalBoxes(wrapper)[1]!.get('input').setValue(false)

      expect(correctBoxes(wrapper).map((box) => box.text())).toEqual(['R', '4', '5', 'b7'])
    })

    it('never asks for answers otherwise', async () => {
      serve([penta])
      const wrapper = mountPicker()
      await flushPromises()
      await choose(wrapper)

      expect(correctBoxes(wrapper)).toHaveLength(0)
    })
  })
})
