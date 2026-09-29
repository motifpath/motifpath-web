import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

// The playback settings list the voices; no voice matters to these tests.
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({
    coreApi: { GET: () => Promise.resolve({ data: [], error: undefined, response: { status: 200 } }) },
    eventApi: {},
  }),
}))

import DiagramStimulusEditor from '@/features/teacher/components/DiagramStimulusEditor.vue'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import { makeFrettedDiagram, makeFrettedInstrument } from '@/shared/testUtils/diagram'
import type { components } from '@/api/generated/core-domain'

type DiagramRef = components['schemas']['DiagramRef']

const penta = makeFrettedDiagram({ diagram_id: 'd-penta' })
const guitar = makeFrettedInstrument()
const fresh: DiagramRef = { diagram_id: 'd-penta', layers: { label: 'custom' }, correct_position_ids: [] }

function mountEditor(diagramRef: DiagramRef = fresh) {
  return mount(DiagramStimulusEditor, { props: { diagram: penta, instrument: guitar, diagramRef } })
}

type Editor = ReturnType<typeof mountEditor>

function lastUpdate(wrapper: Editor): DiagramRef | undefined {
  return wrapper.emitted('update:diagramRef')?.at(-1)?.[0] as DiagramRef | undefined
}

/** Clicks a marker on the fretboard, the way an author marks a position correct or hides it. */
async function clickPosition(wrapper: Editor, positionId: string) {
  wrapper.getComponent(FrettedDiagramView).vm.$emit('select', positionId)
  await flushPromises()
}

describe('DiagramStimulusEditor', () => {
  it('draws the diagram with every position clickable, hidden ones faded', () => {
    const wrapper = mountEditor()
    const view = wrapper.getComponent(FrettedDiagramView)

    expect(view.props('revealHidden')).toBe(true)
    expect(view.props('selectablePositionIds')).toEqual(['p0', 'p1', 'p2', 'p3', 'p4', 'p5'])
  })

  it('starts on marking correct positions, and warns until one is', async () => {
    const wrapper = mountEditor()

    expect(wrapper.get('[data-test="embed-picker-tool-correct"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('[data-test="stimulus-no-correct"]').exists()).toBe(true)

    await clickPosition(wrapper, 'p0')

    expect(wrapper.find('[data-test="stimulus-no-correct"]').exists()).toBe(false)
    expect(wrapper.getComponent(FrettedDiagramView).props('selectedPositionIds')).toEqual(['p0'])
    expect(lastUpdate(wrapper)?.correct_position_ids).toEqual(['p0'])
  })

  it('reports the ref even with no correct position yet, as an image with no correct region is kept', async () => {
    const wrapper = mountEditor()
    await clickPosition(wrapper, 'p0')
    await clickPosition(wrapper, 'p0')

    expect(lastUpdate(wrapper)).toEqual(expect.objectContaining({ diagram_id: 'd-penta', correct_position_ids: [] }))
  })

  it('switches to hiding positions, and a hidden position stays correct', async () => {
    const wrapper = mountEditor()
    await clickPosition(wrapper, 'p0')

    await wrapper.get('[data-test="embed-picker-tool-visibility"]').trigger('click')
    await clickPosition(wrapper, 'p0')

    expect(lastUpdate(wrapper)).toEqual(
      expect.objectContaining({ correct_position_ids: ['p0'], layers: expect.objectContaining({ hidden_position_ids: ['p0'] }) }),
    )
  })

  it('hides an interval at a time with its chip', async () => {
    const wrapper = mountEditor()

    await wrapper.findAll('[data-test="embed-picker-interval"]')[0]!.trigger('click')

    expect(lastUpdate(wrapper)?.layers.hidden_position_ids).toEqual(['p0', 'p5'])
  })

  it('selects what the markers show', async () => {
    const wrapper = mountEditor()

    await wrapper.get('[data-test="embed-picker-label"]').setValue('note')

    expect(lastUpdate(wrapper)?.layers.label).toBe('note')
  })

  it('restores a saved stimulus: its labels, hidden and correct positions', () => {
    const wrapper = mountEditor({
      diagram_id: 'd-penta',
      layers: { label: 'none', hidden_position_ids: ['p1'] },
      correct_position_ids: ['p0', 'p5'],
    })

    expect((wrapper.get('[data-test="embed-picker-label"]').element as HTMLSelectElement).value).toBe('none')
    expect(wrapper.getComponent(FrettedDiagramView).props('selectedPositionIds')).toEqual(['p0', 'p5'])
    expect(wrapper.getComponent(FrettedDiagramView).props('diagramRef').layers.hidden_position_ids).toEqual(['p1'])
  })

  it('reports an older stimulus with its correct intervals as the positions they meant', () => {
    const wrapper = mountEditor({ diagram_id: 'd-penta', layers: { intervals: true }, correct_intervals: ['R'] })

    expect(lastUpdate(wrapper)).toEqual(expect.objectContaining({ correct_position_ids: ['p0', 'p5'] }))
    expect(lastUpdate(wrapper)?.correct_intervals).toBeUndefined()
  })
})
