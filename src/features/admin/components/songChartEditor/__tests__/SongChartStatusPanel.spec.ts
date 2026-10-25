import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const ok = <T>(data: T) => Promise.resolve({ data, error: undefined, response: { status: 200 } })
const I_IV_V_I = { progression_id: 'p1', key: 'I-IV-V-I', bars: ['I', 'IV', 'V', 'I'], confusable: [], names: { en: 'I–IV–V–I' } }
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET: () => ok([I_IV_V_I]) }, eventApi: {} }),
}))

import SongChartStatusPanel from '@/features/admin/components/songChartEditor/SongChartStatusPanel.vue'
import type { PublishBlocker } from '@/features/admin/utils/publishBlockers'
import { makeRevisionSummary, makeSongChart } from '@/shared/testUtils/songChart'

const blockers: PublishBlocker[] = [
  { kind: 'rights' },
  { kind: 'chord', anchorId: 'a3', symbol: 'H7', problem: 'not_a_chord', section: { kind: 'verse', label: null }, line: 2 },
  { kind: 'chord', anchorId: 'a4', symbol: 'C#7', problem: 'not_in_catalog', section: { kind: 'chorus', label: 'Refrão' }, line: 1 },
]

function mountPanel(props: Partial<InstanceType<typeof SongChartStatusPanel>['$props']> = {}) {
  return mount(SongChartStatusPanel, { props: { chart: makeSongChart('c-1'), blockers: [], busy: false, ...props } })
}

describe('SongChartStatusPanel', () => {
  it('says a draft was never published, lists every reason it cannot be yet, and waits to publish', () => {
    const wrapper = mountPanel({ blockers })

    expect(wrapper.get('[data-test="status-chip"]').text()).toBe('Draft')
    expect(wrapper.get('[data-test="status-text"]').text()).toBe("Draft — never published. Learners can't see it.")
    expect(wrapper.findAll('[data-test="blocker"]').map((b) => b.text())).toEqual([
      'Confirm the rights',
      '“H7” in Verse, line 2, isn’t a chord',
      '“C#7” in Refrão, line 1, isn’t in the chord catalog',
    ])
    expect(wrapper.get('[data-test="publish"]').attributes('disabled')).toBeDefined()
  })

  it("names the section and the progression of a tag the section doesn't play, by the progression's name", async () => {
    const wrapper = mountPanel({ blockers: [{ kind: 'progression', progressionKey: 'I-IV-V-I', section: { kind: 'verse', label: null } }] })
    await flushPromises()

    expect(wrapper.get('[data-test="blocker"]').text()).toBe('Verse: play I–IV–V–I in a row, or remove the tag')
    expect(wrapper.get('[data-test="publish"]').attributes('disabled')).toBeDefined()
  })

  it('publishes once nothing stops it', async () => {
    const wrapper = mountPanel()

    expect(wrapper.find('[data-test="blocker"]').exists()).toBe(false)
    await wrapper.get('[data-test="publish"]').trigger('click')

    expect(wrapper.emitted('publish')).toHaveLength(1)
  })

  it('offers to withdraw a published chart', async () => {
    const chart = makeSongChart('c-1', {}, { status: 'published', published_revision: makeRevisionSummary(2) })
    const wrapper = mountPanel({ chart })

    expect(wrapper.get('[data-test="status-text"]').text()).toBe('Published — learners read revision 2.')
    await wrapper.get('[data-test="withdraw"]').trigger('click')

    expect(wrapper.emitted('withdraw')).toHaveLength(1)
  })

  it('says who withdrew a chart, when and why, and offers to publish it again', () => {
    const chart = makeSongChart(
      'c-1',
      {},
      {
        status: 'withdrawn',
        published_revision: makeRevisionSummary(1),
        withdrawal: { withdrawn_by: { user_id: 'u-ana', display_name: 'Ana' }, withdrawn_at: '2026-10-02T12:00:00Z', reason: 'The rights holder asked us to' },
      },
    )
    const wrapper = mountPanel({ chart })

    expect(wrapper.get('[data-test="status-text"]').text()).toContain('Withdrawn by Ana')
    expect(wrapper.get('[data-test="status-text"]').text()).toContain('The rights holder asked us to')
    expect(wrapper.get('[data-test="publish"]').text()).toBe('Publish again')
    expect(wrapper.find('[data-test="withdraw"]').exists()).toBe(false)
  })

  it('offers nothing to publish before a new chart is first saved', () => {
    const wrapper = mountPanel({ chart: null })

    expect(wrapper.get('[data-test="status-text"]').text()).toBe('New — save it to start a draft.')
    expect(wrapper.find('[data-test="publish"]').exists()).toBe(false)
  })
})
