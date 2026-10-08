import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { components } from '@/api/generated/core-domain'
import SongChartLyricsEditor from '@/features/admin/components/songChartEditor/SongChartLyricsEditor.vue'
import { makeAnchor, makeLearnerSongChart, makeLyricLine, makeSection } from '@/shared/testUtils/songChart'

type SongChartDocument = components['schemas']['SongChartDocument']

function mountEditor(doc: SongChartDocument = makeLearnerSongChart().body) {
  return mount(SongChartLyricsEditor, { props: { modelValue: doc } })
}

function lastEmitted(wrapper: ReturnType<typeof mountEditor>): SongChartDocument {
  const events = wrapper.emitted<[SongChartDocument]>('update:modelValue')
  if (!events?.length) throw new Error('update:modelValue was never emitted')
  return events[events.length - 1]![0]
}

describe('SongChartLyricsEditor', () => {
  it('shows the lyrics with each chord on its word, and each section', async () => {
    const wrapper = mountEditor()
    await flushPromises()

    expect(wrapper.text()).toContain('Quando olhei a terra ardendo')
    expect(wrapper.findAll('[data-chord]').map((c) => [c.attributes('data-chord'), c.element.textContent])).toEqual([
      ['G', 'Quando olhei a '],
      ['C', 'terra ardendo'],
      ['G', 'Que braseiro'],
    ])
    expect(wrapper.findAll('section[data-kind]').map((s) => [s.attributes('data-kind'), s.attributes('data-label') ?? null])).toEqual([
      ['verse', null],
      ['chorus', 'Refrão'],
    ])
  })

  it("changes the kind and label of the section the cursor is in", async () => {
    const wrapper = mountEditor()
    await flushPromises()

    await wrapper.get('[data-test="section-kind"]').setValue('intro')
    await wrapper.get('[data-test="section-label"]').setValue('Abertura')
    await wrapper.get('[data-test="section-label"]').trigger('change')

    expect(lastEmitted(wrapper).content[0]!.attrs).toEqual({ kind: 'intro', label: 'Abertura' })
  })

  it('adds a section of the chosen kind after the one the cursor is in', async () => {
    const wrapper = mountEditor()
    await flushPromises()

    await wrapper.get('[data-test="add-section"]').trigger('click')

    expect(wrapper.findAll('section[data-kind]')).toHaveLength(3)
  })

  it('adds a comment line', async () => {
    const wrapper = mountEditor()
    await flushPromises()

    await wrapper.get('[data-test="add-comment"]').trigger('click')

    expect(wrapper.findAll('p[data-comment]')).toHaveLength(1)
  })

  it('shows lyrics given from outside, such as an import, in place of what it held', async () => {
    const wrapper = mountEditor()
    await flushPromises()

    await wrapper.setProps({
      modelValue: { type: 'doc', content: [makeSection([makeLyricLine(['Ciranda', makeAnchor('a1', 'C')])])] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Ciranda')
    expect(wrapper.text()).not.toContain('Quando olhei')
  })

  it('starts a new chart with one empty verse to write in', async () => {
    const wrapper = mountEditor({ type: 'doc', content: [] })
    await flushPromises()

    expect(wrapper.findAll('section[data-kind="verse"]')).toHaveLength(1)
    expect(wrapper.findAll('p[data-lyric-line]')).toHaveLength(1)
  })
})
