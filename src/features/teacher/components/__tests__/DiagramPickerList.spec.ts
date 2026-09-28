import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import DiagramPickerList from '@/features/teacher/components/DiagramPickerList.vue'
import DiagramThumbnail from '@/shared/components/diagram/DiagramThumbnail.vue'
import TeacherFilterPicker from '@/shared/components/TeacherFilterPicker.vue'
import { makeFrettedDiagram, makeFrettedInstrument } from '@/shared/testUtils/diagram'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']

const ok = <T>(data: T) => Promise.resolve({ data, error: undefined, response: { status: 200 } })
const fail = () => Promise.resolve({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

function page(items: Diagram[], total = items.length) {
  return ok({ items, total, limit: 20, offset: 0 })
}

const pentatonic = makeFrettedDiagram({
  diagram_id: 'd-penta',
  names: { en: 'A minor pentatonic' },
  created_by: { user_id: 'u-bob', display_name: 'Bob Ferreira' },
})
const major = makeFrettedDiagram({ diagram_id: 'd-major', names: { en: 'C major scale' }, kind: 'basic' })
const base = makeFrettedDiagram({ diagram_id: 'd-base', names: { en: 'The one being edited' } })

/** Answers /diagrams from `pages` in turn (the last one repeats); instruments and creators always succeed. */
function serve(...pages: (() => Promise<unknown>)[]) {
  let call = 0
  GET.mockImplementation((path: string) => {
    if (path === '/instruments') return ok([makeFrettedInstrument()])
    if (path === '/diagrams/creators') return ok([{ user_id: 'u-bob', display_name: 'Bob Ferreira' }])
    const next = pages[Math.min(call, pages.length - 1)]!
    call += 1
    return next()
  })
}

function diagramQueries() {
  return GET.mock.calls.filter(([path]) => path === '/diagrams').map(([, options]) => options.params.query)
}

function mountPicker(
  props: { instrumentId?: string; excludeIds?: string[]; emptyHeading?: string; emptyMessage?: string } = {},
) {
  return mount(DiagramPickerList, { props: { instrumentId: 'instrument-guitar', excludeIds: [], ...props } })
}

type Picker = ReturnType<typeof mountPicker>

function rowTexts(wrapper: Picker): string[] {
  return wrapper.findAll('[data-test="diagram-option-name"]').map((name) => name.text())
}

describe('DiagramPickerList', () => {
  beforeEach(() => {
    GET.mockReset()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('lists diagrams of the given instrument, marking templates', async () => {
    serve(() => page([pentatonic, major]))
    const wrapper = mountPicker()
    await flushPromises()

    expect(diagramQueries()[0]).toEqual(expect.objectContaining({ instrument_id: 'instrument-guitar' }))
    expect(rowTexts(wrapper)).toEqual(['A minor pentatonic', 'C major scale'])
    const badges = wrapper.findAll('[data-test="diagram-option"]').map((row) => row.find('[data-test="template-badge"]').exists())
    expect(badges).toEqual([false, true])
  })

  it('shows each diagram whole, and who made it', async () => {
    serve(() => page([pentatonic]))
    const wrapper = mountPicker()
    await flushPromises()

    const option = wrapper.get('[data-test="diagram-option"]')
    expect(option.getComponent(DiagramThumbnail).props('diagram')).toEqual(pentatonic)
    expect(option.getComponent(DiagramThumbnail).props('instruments')).toEqual([makeFrettedInstrument()])
    expect(option.get('[data-test="diagram-option-author"]').text()).toBe('Bob Ferreira')
  })

  it('leaves out the diagrams it is told to', async () => {
    serve(() => page([base, pentatonic, major]))
    const wrapper = mountPicker({ excludeIds: ['d-base', 'd-major'] })
    await flushPromises()

    expect(rowTexts(wrapper)).toEqual(['A minor pentatonic'])
  })

  it('picks a diagram', async () => {
    serve(() => page([pentatonic]))
    const wrapper = mountPicker()
    await flushPromises()

    await wrapper.get('[data-test="diagram-option"]').trigger('click')

    expect(wrapper.emitted('select')).toEqual([[pentatonic]])
  })

  it('shows a loading state while fetching', () => {
    GET.mockImplementation((path: string) => (path === '/diagrams' ? new Promise(() => {}) : ok([])))
    const wrapper = mountPicker()

    expect(wrapper.find('[data-test="diagram-picker-loading"]').exists()).toBe(true)
  })

  it('shows an error with a retry that loads again', async () => {
    serve(fail, () => page([pentatonic]))
    const wrapper = mountPicker()
    await flushPromises()

    await wrapper.get('[data-test="diagram-picker-error"] [data-test="retry"]').trigger('click')
    await flushPromises()

    expect(rowTexts(wrapper)).toEqual(['A minor pentatonic'])
  })

  it('says when there is nothing to offer', async () => {
    serve(() => page([base]))
    const wrapper = mountPicker({ excludeIds: ['d-base'] })
    await flushPromises()

    expect(wrapper.get('[data-test="diagram-picker-empty"]').text()).toContain('No diagrams yet')
  })

  it('says it in the caller’s own words when given', async () => {
    serve(() => page([]))
    const wrapper = mountPicker({ emptyHeading: 'Nothing to overlay', emptyMessage: 'No other diagram.' })
    await flushPromises()

    const empty = wrapper.get('[data-test="diagram-picker-empty"]').text()
    expect(empty).toContain('Nothing to overlay')
    expect(empty).toContain('No other diagram.')
  })

  it('lists diagrams of every instrument when none is given', async () => {
    serve(() => page([pentatonic]))
    mount(DiagramPickerList)
    await flushPromises()

    expect(diagramQueries()[0]).not.toHaveProperty('instrument_id')
  })

  it('still offers more when the loaded page holds only diagrams it leaves out', async () => {
    serve(() => page([base], 2))
    const wrapper = mountPicker({ excludeIds: ['d-base'] })
    await flushPromises()

    expect(wrapper.find('[data-test="diagram-picker-empty"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="load-more"]').exists()).toBe(true)
  })

  it('loads more diagrams on request', async () => {
    serve(() => page([pentatonic], 2), () => page([major], 2))
    const wrapper = mountPicker()
    await flushPromises()

    await wrapper.get('[data-test="load-more"]').trigger('click')
    await flushPromises()

    expect(rowTexts(wrapper)).toHaveLength(2)
  })

  describe('filters', () => {
    it('searches by name once typing pauses', async () => {
      vi.useFakeTimers()
      serve(() => page([pentatonic]))
      const wrapper = mountPicker()
      await flushPromises()

      await wrapper.get('[data-test="diagram-search"]').setValue('  penta ')
      expect(diagramQueries()).toHaveLength(1)
      await vi.advanceTimersByTimeAsync(300)
      await flushPromises()

      expect(diagramQueries().at(-1)).toEqual(expect.objectContaining({ name: 'penta' }))
    })

    it('keeps the current results on screen while a filter reloads, so nothing jumps', async () => {
      let call = 0
      GET.mockImplementation((path: string) => {
        if (path === '/instruments') return ok([makeFrettedInstrument()])
        if (path === '/diagrams/creators') return ok([])
        call += 1
        return call === 1 ? page([pentatonic]) : new Promise(() => {})
      })
      const wrapper = mountPicker()
      await flushPromises()

      await wrapper.get('[data-test="diagram-root-filter"]').setValue('F#')
      await flushPromises()

      expect(wrapper.find('[data-test="diagram-picker-loading"]').exists()).toBe(false)
      expect(rowTexts(wrapper)).toEqual(['A minor pentatonic'])
      expect(wrapper.get('[data-test="diagram-picker-results"]').attributes('aria-busy')).toBe('true')
    })

    it('filters by root note', async () => {
      serve(() => page([pentatonic]))
      const wrapper = mountPicker()
      await flushPromises()

      await wrapper.get('[data-test="diagram-root-filter"]').setValue('F#')
      await flushPromises()

      expect(diagramQueries().at(-1)).toEqual(expect.objectContaining({ root_note: 'F#' }))
    })

    it('narrows to templates or custom diagrams, and back to all', async () => {
      serve(() => page([pentatonic]))
      const wrapper = mountPicker()
      await flushPromises()

      await wrapper.get('[data-test="diagram-kind-basic"]').trigger('click')
      await flushPromises()
      expect(diagramQueries().at(-1)).toEqual(expect.objectContaining({ kind: 'basic' }))

      await wrapper.get('[data-test="diagram-kind-custom"]').trigger('click')
      await flushPromises()
      expect(diagramQueries().at(-1)).toEqual(expect.objectContaining({ kind: 'custom' }))

      await wrapper.get('[data-test="diagram-kind-all"]').trigger('click')
      await flushPromises()
      expect(diagramQueries().at(-1)).not.toHaveProperty('kind')
    })

    it('filters by author, offering the diagram library’s creators', async () => {
      serve(() => page([pentatonic]))
      const wrapper = mountPicker()
      await flushPromises()

      const author = wrapper.getComponent(TeacherFilterPicker)
      expect(author.props('scope')).toBe('diagrams')
      expect(author.props('label')).toBe('Author')
      author.vm.$emit('update:modelValue', { user_id: 'u-bob', display_name: 'Bob Ferreira' })
      await flushPromises()

      expect(diagramQueries().at(-1)).toEqual(expect.objectContaining({ created_by: 'u-bob' }))
    })

    it('says nothing matches, and clears the filters on request', async () => {
      serve(() => page([pentatonic]), () => page([]), () => page([pentatonic]))
      const wrapper = mountPicker()
      await flushPromises()

      await wrapper.get('[data-test="diagram-root-filter"]').setValue('Db')
      await flushPromises()
      expect(wrapper.find('[data-test="diagram-picker-no-matches"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="diagram-picker-empty"]').exists()).toBe(false)

      await wrapper.get('[data-test="diagram-filters-clear"]').trigger('click')
      await flushPromises()

      expect(diagramQueries().at(-1)).not.toHaveProperty('root_note')
      expect(rowTexts(wrapper)).toEqual(['A minor pentatonic'])
    })
  })
})
