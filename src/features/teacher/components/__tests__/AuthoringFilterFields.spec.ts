import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AuthoringFilterFields from '@/features/teacher/components/AuthoringFilterFields.vue'
import type { AuthoringListFilters } from '@/features/teacher/utils/authoringListQuery'
import type { TreeNode } from '@/shared/utils/skillConceptTree'

const skills: TreeNode[] = [
  { id: 'scales', name: 'Scales', parent_id: null },
  { id: 'pentatonic', name: 'Pentatonic shapes', parent_id: 'scales' },
  { id: 'modes', name: 'Modes', parent_id: 'scales' },
]
const instruments = [
  { id: 'guitar', name: 'Guitar' },
  { id: 'piano', name: 'Piano' },
]

type Props = InstanceType<typeof AuthoringFilterFields>['$props']

function mountFields(props: Partial<Props> = {}) {
  return mount(AuthoringFilterFields, {
    props: {
      section: 'diagrams',
      modelValue: { skills: [], concepts: [] },
      instruments,
      skillNodes: skills,
      conceptNodes: [],
      me: { user_id: 'u-me', display_name: 'Bob Martins' },
      authorName: null,
      ...props,
    },
  })
}

function group(wrapper: ReturnType<typeof mountFields>, key: string) {
  return wrapper.get(`[data-test="filter-group-${key}"]`)
}

function chip(wrapper: ReturnType<typeof mountFields>, key: string, label: string) {
  const found = group(wrapper, key)
    .findAll('button[aria-pressed]')
    .find((button) => button.text() === label)
  if (!found) throw new Error(`no chip ${label} in ${key}`)
  return found
}

const lastFilters = (wrapper: ReturnType<typeof mountFields>) =>
  wrapper.emitted<[AuthoringListFilters]>('update:modelValue')?.at(-1)?.[0]

describe('AuthoringFilterFields', () => {
  it("shows the section's filters in order", () => {
    const groups = mountFields({ section: 'exercises' })
      .findAll('[data-test^="filter-group-"]')
      .map((g) => g.attributes('data-test'))

    expect(groups).toEqual([
      'filter-group-type',
      'filter-group-instrument',
      'filter-group-language',
      'filter-group-skills',
      'filter-group-concepts',
      'filter-group-author',
    ])
  })

  it('offers the exercise types', () => {
    const labels = group(mountFields({ section: 'exercises' }), 'type')
      .findAll('button[aria-pressed]')
      .map((b) => b.text())
    expect(labels).toEqual(['Any', 'Image recognition', 'Image choice', 'Audio recognition', 'Audio selection', 'Text response'])
  })

  it('offers Kind and Shows on diagrams, with All and Diagrams chosen by default', () => {
    const wrapper = mountFields()

    expect(group(wrapper, 'kind').findAll('button[aria-pressed]').map((b) => b.text())).toEqual(['All', 'Templates', 'Custom'])
    expect(group(wrapper, 'shows').findAll('button[aria-pressed]').map((b) => b.text())).toEqual([
      'Diagrams',
      'Chord voicings',
      'Both',
    ])
    expect(chip(wrapper, 'kind', 'All').attributes('aria-pressed')).toBe('true')
    expect(chip(wrapper, 'shows', 'Diagrams').attributes('aria-pressed')).toBe('true')
  })

  it('sets a filter from its chip, and Any clears it', async () => {
    const wrapper = mountFields()

    await chip(wrapper, 'instrument', 'Guitar').trigger('click')
    expect(lastFilters(wrapper)).toEqual({ skills: [], concepts: [], instrument: 'guitar' })

    await wrapper.setProps({ modelValue: { skills: [], concepts: [], instrument: 'guitar' } })
    await chip(wrapper, 'instrument', 'Any').trigger('click')
    expect(lastFilters(wrapper)).toEqual({ skills: [], concepts: [] })
  })

  it('sets Shows back to plain diagrams by clearing it', async () => {
    const wrapper = mountFields({ modelValue: { skills: [], concepts: [], shows: 'both' } })

    await chip(wrapper, 'shows', 'Diagrams').trigger('click')

    expect(lastFilters(wrapper)).toEqual({ skills: [], concepts: [] })
  })

  it('takes one root note', async () => {
    const wrapper = mountFields()

    await group(wrapper, 'root').get('select').setValue('A')

    expect(lastFilters(wrapper)).toEqual({ skills: [], concepts: [], root: 'A' })
  })

  describe('Skill, Concept and Author', () => {
    it('sums up the chosen skills, and opens the Skills page', async () => {
      const wrapper = mountFields({ modelValue: { skills: ['pentatonic', 'modes'], concepts: [] } })
      const row = group(wrapper, 'skills').get('button')

      expect(row.text()).toContain('2 skills')
      await row.trigger('click')
      expect(wrapper.emitted('open')).toEqual([['skills']])
    })

    it('names a single chosen skill', () => {
      const wrapper = mountFields({ modelValue: { skills: ['pentatonic'], concepts: [] } })
      expect(group(wrapper, 'skills').text()).toContain('Pentatonic shapes')
    })

    it('says Any with nothing chosen', () => {
      expect(group(mountFields(), 'concepts').text()).toContain('Any')
    })

    it('names the author, Me for oneself, and opens the Author page', async () => {
      const wrapper = mountFields({ modelValue: { skills: [], concepts: [], author: 'u-me' } })
      expect(group(wrapper, 'author').text()).toContain('Me')

      await wrapper.setProps({ modelValue: { skills: [], concepts: [], author: 'u-ana' }, authorName: 'Ana Souza' })
      expect(group(wrapper, 'author').text()).toContain('Ana Souza')

      await group(wrapper, 'author').get('button').trigger('click')
      expect(wrapper.emitted('open')).toEqual([['author']])
    })
  })
})
