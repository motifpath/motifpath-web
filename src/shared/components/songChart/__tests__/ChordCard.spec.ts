import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'

const toggle = vi.fn()
vi.mock('@/shared/composables/useDiagramPlayback', () => ({
  useDiagramPlayback: () => ({ canPlay: ref(true), state: ref('idle'), activePositionIds: ref([]), toggle }),
  isPlayable: () => true,
}))

import ChordCard from '@/shared/components/songChart/ChordCard.vue'
import { makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { chordC, cBarre, cOpen, makeVoicingDiagram } from '@/shared/testUtils/songChart'

const instrument = makeFrettedInstrument()
const diagrams = [makeVoicingDiagram(cOpen), makeVoicingDiagram(cBarre)]

// The chord box and the neck draw a voicing; these tests are about what the card offers.
const stubs = {
  ChordBox: { props: ['voicing'], template: '<div data-test="chord-box" :data-voicing-id="voicing.chord_voicing_id" />' },
  FrettedDiagramView: {
    props: ['diagram', 'compact', 'regionInfo'],
    template: '<div data-test="neck" :data-diagram-id="diagram.diagram_id" :data-compact="String(compact)" :data-region-info="String(regionInfo)" />',
  },
}

type Props = InstanceType<typeof ChordCard>['$props']

function mountCard(props: Partial<Props> = {}): VueWrapper {
  return mount(ChordCard, {
    props: {
      writtenSymbol: 'C',
      chordSymbol: chordC.canonical_symbol,
      voicings: chordC.voicings,
      voicingId: cOpen.chord_voicing_id,
      view: 'box',
      minimized: false,
      diagrams,
      instrument,
      missingBass: null,
      placement: 'floating',
      ...props,
    },
    global: { stubs },
  })
}

function chips(wrapper: VueWrapper) {
  return wrapper.findAll('[data-test="voicing-chip"]')
}

beforeEach(() => {
  toggle.mockReset()
})

describe('ChordCard', () => {
  it('shows the chord as written, as a chord box on the chosen voicing, with the voicings named by position', () => {
    const wrapper = mountCard()

    expect(wrapper.get('[data-test="chord-card-title"]').text()).toBe('C')
    expect(wrapper.get('[data-test="chord-box"]').attributes('data-voicing-id')).toBe(cOpen.chord_voicing_id)
    expect(chips(wrapper).map((c) => c.text())).toEqual(['Open', '3fr'])
    expect(chips(wrapper).map((c) => c.attributes('aria-pressed'))).toEqual(['true', 'false'])
  })

  it('asks for another voicing when a chip is chosen', async () => {
    const wrapper = mountCard()

    await chips(wrapper)[1]!.trigger('click')

    expect(wrapper.emitted('update:voicingId')).toEqual([[cBarre.chord_voicing_id]])
  })

  it('offers Box | Neck and asks for the neck when it is chosen', async () => {
    const wrapper = mountCard()

    await wrapper.get('[data-test="chord-view-neck"]').trigger('click')

    expect(wrapper.emitted('update:view')).toEqual([['neck']])
  })

  it('draws the neck at a readable size, not scaled down to fit, with no region controls', () => {
    const wrapper = mountCard({ view: 'neck' })

    const neck = wrapper.get('[data-test="neck"]')
    expect(neck.attributes('data-diagram-id')).toBe(cOpen.diagram_id)
    expect(neck.attributes('data-compact')).not.toBe('true')
    expect(neck.attributes('data-region-info')).toBe('false')
    expect(wrapper.find('[data-test="chord-box"]').exists()).toBe(false)
  })

  it.each(['box', 'neck'] as const)('plays the voicing from the %s view, named after its default playback', async (view) => {
    const wrapper = mountCard({ view })

    const play = wrapper.get('[data-test="play-voicing"]')
    expect(play.text()).toContain('Strum')
    await play.trigger('click')

    expect(toggle).toHaveBeenCalled()
  })

  it("says so when the voicing's diagram can't be shown", () => {
    const wrapper = mountCard({ diagrams: [] })

    expect(wrapper.find('[data-test="chord-box"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="voicing-unavailable"]').text()).not.toBe('')
  })

  it("notes a slash chord's bass that the voicings don't have", () => {
    const wrapper = mountCard({ writtenSymbol: 'C/B', missingBass: 'B' })

    expect(wrapper.get('[data-test="chord-card-title"]').text()).toBe('C/B')
    expect(wrapper.get('[data-test="missing-bass"]').text()).toBe("Shows C — the bass note B isn't shown")
  })

  it('closes', async () => {
    const wrapper = mountCard()

    await wrapper.get('[data-test="chord-card-close"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  describe('floating', () => {
    it('minimizes to a chip with the chord', async () => {
      const wrapper = mountCard()

      await wrapper.get('[data-test="chord-card-minimize"]').trigger('click')

      expect(wrapper.emitted('update:minimized')).toEqual([[true]])
    })

    it('shows only a chip with the chord while minimized, and expands when it is tapped', async () => {
      const wrapper = mountCard({ minimized: true })

      expect(wrapper.find('[data-test="chord-box"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="voicing-chip"]').exists()).toBe(false)
      const chip = wrapper.get('[data-test="chord-card-chip"]')
      expect(chip.text()).toBe('C')

      await chip.trigger('click')

      expect(wrapper.emitted('update:minimized')).toEqual([[false]])
    })
  })

  describe('docked in a side pane', () => {
    it('fills the pane and still minimizes and closes', async () => {
      const wrapper = mountCard({ placement: 'docked' })

      expect(wrapper.get('[data-test="chord-card"]').classes()).toContain('w-full')
      await wrapper.get('[data-test="chord-card-close"]').trigger('click')
      expect(wrapper.emitted('close')).toHaveLength(1)
      expect(wrapper.find('[data-test="chord-card-minimize"]').exists()).toBe(true)
    })
  })
})
