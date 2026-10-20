import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import SkillProgressRow from '@/features/student/components/SkillProgressRow.vue'
import { i18n } from '@/i18n'

afterEach(() => {
  i18n.global.locale.value = 'en'
})

const majorTriads = { node_id: 'major-triads', names: { en: 'Major triads', pt_BR: 'Tríades maiores' } }

describe('SkillProgressRow', () => {
  it('shows the skill, what moved, and from where to where as percentages', () => {
    const wrapper = mount(SkillProgressRow, { props: { line: { ...majorTriads, measure: 'accuracy', before: 0.62, after: 0.85 } } })

    expect(wrapper.get('[data-test="skill-progress-name"]').text()).toBe('Major triads')
    expect(wrapper.get('[data-test="skill-progress-measure"]').text()).toBe('Accuracy')
    expect(wrapper.get('[data-test="skill-progress-change"]').text()).toBe('62% → 85%')
  })

  it('shows a tempo in beats per minute', () => {
    const wrapper = mount(SkillProgressRow, { props: { line: { ...majorTriads, measure: 'best_clean_tempo_bpm', before: 80, after: 96 } } })

    expect(wrapper.get('[data-test="skill-progress-measure"]').text()).toBe('Best clean tempo')
    expect(wrapper.get('[data-test="skill-progress-change"]').text()).toBe('80 → 96 BPM')
  })

  it('reads in pt-BR', () => {
    i18n.global.locale.value = 'pt-BR'
    const wrapper = mount(SkillProgressRow, { props: { line: { ...majorTriads, measure: 'fluency', before: 0.4, after: 0.55 } } })

    expect(wrapper.get('[data-test="skill-progress-name"]').text()).toBe('Tríades maiores')
    expect(wrapper.get('[data-test="skill-progress-measure"]').text()).toBe('Fluência')
    expect(wrapper.get('[data-test="skill-progress-change"]').text()).toBe('40% → 55%')
  })
})
