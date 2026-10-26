import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const ok = <T>(data: T) => Promise.resolve({ data, error: undefined, response: { status: 200 } })
const progression = (key: string, en: string) => ({ progression_id: key, key, bars: [], confusable: [], names: { en } })
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET: () => ok([progression('I-IV-V-I', 'I–IV–V–I'), progression('I-IV-I-V', 'I–IV–I–V')]) }, eventApi: {} }),
}))

import SongChartSectionHeading from '@/features/admin/components/songChartEditor/SongChartSectionHeading.vue'
import { clearProgressionCatalog } from '@/shared/composables/useProgressionCatalog'

type Props = InstanceType<typeof SongChartSectionHeading>['$props']

async function mountHeading(props: Partial<Props> = {}) {
  clearProgressionCatalog()
  const wrapper = mount(SongChartSectionHeading, {
    props: { section: { kind: 'verse', label: null, progression_keys: ['I-IV-I-V'] }, unplayed: [], concertKey: 'G', ...props },
  })
  await flushPromises()
  return wrapper
}

const chips = (wrapper: Awaited<ReturnType<typeof mountHeading>>) => wrapper.findAll('[data-test="progression-chip"]')

describe('SongChartSectionHeading', () => {
  it("names the section and each progression it's tagged with, and offers to add one", async () => {
    const wrapper = await mountHeading({ section: { kind: 'verse', label: 'Verse 1', progression_keys: ['I-IV-I-V', 'I-IV-V-I'] } })

    expect(wrapper.get('[data-test="section-name"]').text()).toBe('Verse 1')
    expect(chips(wrapper).map((c) => c.text())).toEqual(['I–IV–I–V', 'I–IV–V–I'])
    expect(wrapper.get('[data-test="add-progression"]').text()).toBe('+ Progression')
  })

  it('calls a section with no label by its kind, and shows no chip for a section with no tag', async () => {
    const wrapper = await mountHeading({ section: { kind: 'chorus', label: null, progression_keys: [] } })

    expect(wrapper.get('[data-test="section-name"]').text()).toBe('Chorus')
    expect(chips(wrapper)).toHaveLength(0)
  })

  it('removes a tag with its ×, and asks for the picker with + Progression', async () => {
    const wrapper = await mountHeading()

    await wrapper.get('[data-test="remove-progression"]').trigger('click')
    await wrapper.get('[data-test="add-progression"]').trigger('click')

    expect(wrapper.get('[data-test="remove-progression"]').attributes('aria-label')).toBe('Remove I–IV–I–V')
    expect(wrapper.emitted('remove')).toEqual([['I-IV-I-V']])
    expect(wrapper.emitted('add')).toHaveLength(1)
  })

  it("marks a tag the section doesn't play and says why under the heading", async () => {
    const wrapper = await mountHeading({ section: { kind: 'verse', label: null, progression_keys: ['I-IV-V-I', 'I-IV-I-V'] }, unplayed: ['I-IV-V-I'], concertKey: 'C' })

    expect(chips(wrapper).map((c) => c.attributes('data-unplayed'))).toEqual(['true', 'false'])
    expect(wrapper.get('[data-test="not-played"]').text()).toBe(
      'Not played in this verse: its chords never come I–IV–V–I in a row in C. Change the chords or remove the tag.',
    )
  })

  it("says the song needs a key when it has none, since a progression is only found in one", async () => {
    const wrapper = await mountHeading({ section: { kind: 'chorus', label: null, progression_keys: ['I-IV-V-I'] }, unplayed: ['I-IV-V-I'], concertKey: null })

    expect(wrapper.get('[data-test="not-played"]').text()).toBe(
      "Not played in this chorus: the song has no key, so its progressions can't be found. Set its key, or remove the tag.",
    )
  })

  it('says progressions are found in a major key when the song is in a minor one', async () => {
    const wrapper = await mountHeading({ unplayed: ['I-IV-I-V'], concertKey: 'F#m' })

    expect(wrapper.get('[data-test="not-played"]').text()).toBe(
      'Not played in this verse: progressions are found in a major key, and the song is in F#m. Remove the tag.',
    )
  })
})
