import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import DiagramEmbedPicker from '@/features/teacher/components/DiagramEmbedPicker.vue'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import { clearEmbeddedDiagramCache } from '@/shared/composables/useEmbeddedDiagram'
import { makeFrettedDiagram, makeFrettedInstrument, makeSequencedFrettedDiagram } from '@/shared/testUtils/diagram'
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

function mountPicker(initial: DiagramRef | null = null) {
  return mount(DiagramEmbedPicker, { props: { initial } })
}

type Picker = ReturnType<typeof mountPicker>

function lastChange(wrapper: Picker): DiagramRef | null | undefined {
  return wrapper.emitted('change')?.at(-1)?.[0] as DiagramRef | null | undefined
}

function intervalChips(wrapper: Picker) {
  return wrapper.findAll('[data-test="embed-picker-interval"]')
}

/** Clicks a marker in the preview, the way an author hides a position. */
async function clickPosition(wrapper: Picker, positionId: string) {
  wrapper.getComponent(FrettedDiagramView).vm.$emit('select', positionId)
  await flushPromises()
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

  it('previews a chosen diagram as authored, every position clickable, and reports the ref', async () => {
    serve([penta])
    const wrapper = mountPicker()
    await flushPromises()
    await choose(wrapper)

    expect(wrapper.get('[data-test="embed-picker-name"]').text()).toBe('A minor pentatonic')
    expect((wrapper.get('[data-test="embed-picker-label"]').element as HTMLSelectElement).value).toBe('custom')
    expect(intervalChips(wrapper).map((chip) => chip.text())).toEqual(['R', 'b3', '4', '5', 'b7'])
    const preview = wrapper.getComponent(FrettedDiagramView)
    expect(preview.props()).toEqual(
      expect.objectContaining({ revealHidden: true, multiple: true, selectablePositionIds: ['p0', 'p1', 'p2', 'p3', 'p4', 'p5'] }),
    )
    expect(lastChange(wrapper)).toEqual({
      diagram_id: 'd-penta',
      layers: { label: 'custom', intervals: true, hidden_position_ids: null, subset: null },
    })
  })

  it('offers playback settings for a diagram with a playback', async () => {
    const sequenced = makeSequencedFrettedDiagram({ diagram_id: 'd-penta' })
    byId['d-penta'] = sequenced
    serve([sequenced])

    const playing = mountPicker()
    await flushPromises()
    await choose(playing)
    expect(playing.find('[data-test="embed-picker-playback"]').exists()).toBe(true)
    expect(lastChange(playing)?.playback).toEqual(expect.objectContaining({ direction: 'as_authored' }))
  })

  it('chooses the label mode', async () => {
    serve([penta])
    const wrapper = mountPicker()
    await flushPromises()
    await choose(wrapper)

    await wrapper.get('[data-test="embed-picker-label"]').setValue('note')

    expect(lastChange(wrapper)?.layers.label).toBe('note')
    expect(wrapper.getComponent(FrettedDiagramView).props('diagramRef').layers.label).toBe('note')
  })

  it('hides a position by clicking it, and a whole interval from its chip', async () => {
    serve([penta])
    const wrapper = mountPicker()
    await flushPromises()
    await choose(wrapper)

    await clickPosition(wrapper, 'p2')
    await intervalChips(wrapper)[0]!.trigger('click')

    expect(lastChange(wrapper)?.layers.hidden_position_ids).toEqual(['p0', 'p2', 'p5'])
    expect(intervalChips(wrapper)[0]!.attributes('aria-pressed')).toBe('false')
    expect(intervalChips(wrapper)[2]!.attributes('aria-pressed')).toBe('false')
    expect(intervalChips(wrapper)[1]!.attributes('aria-pressed')).toBe('true')
  })

  it('reports nothing, and says why, with every position hidden', async () => {
    serve([penta])
    const wrapper = mountPicker()
    await flushPromises()
    await choose(wrapper)

    for (const chip of intervalChips(wrapper)) await chip.trigger('click')

    expect(lastChange(wrapper)).toBeNull()
    expect(wrapper.find('[data-test="embed-picker-nothing-shown"]').exists()).toBe(true)
    expect(wrapper.findComponent(FrettedDiagramView).exists()).toBe(true)
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

  it('reopens an embedded diagram with its own settings, reading an older ref’s switch and subset', async () => {
    serve([])
    const wrapper = mountPicker({ diagram_id: 'd-penta', layers: { intervals: false, subset: ['R'] } })
    await flushPromises()

    expect(wrapper.find('[data-test="diagram-option"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="embed-picker-name"]').text()).toBe('A minor pentatonic')
    expect((wrapper.get('[data-test="embed-picker-label"]').element as HTMLSelectElement).value).toBe('none')
    expect(lastChange(wrapper)).toEqual({
      diagram_id: 'd-penta',
      layers: { label: 'none', intervals: false, hidden_position_ids: ['p1', 'p2', 'p3', 'p4'], subset: null },
    })
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

  it('never asks for answers: a stimulus sets them in the exercise form', async () => {
    serve([penta])
    const wrapper = mountPicker()
    await flushPromises()
    await choose(wrapper)

    expect(wrapper.find('[data-test="embed-picker-tool-correct"]').exists()).toBe(false)
    expect(lastChange(wrapper)?.correct_position_ids).toBeUndefined()
  })
})
