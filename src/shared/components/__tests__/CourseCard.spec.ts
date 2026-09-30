import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { components } from '@/api/generated/core-domain'
import CourseCard from '@/shared/components/CourseCard.vue'

type UserRef = components['schemas']['UserRef']

const teacher: UserRef = { user_id: 'teacher-1', display_name: 'Bob Martins' }

function mountCard(overrides: Partial<InstanceType<typeof CourseCard>['$props']> = {}) {
  return mount(CourseCard, {
    props: {
      title: 'Fingerstyle journey',
      summary: 'From first arpeggios to full arrangements.',
      createdBy: teacher,
      level: 'beginner',
      language: 'en',
      lessonCount: 12,
      checkpointCount: 3,
      ...overrides,
    },
    slots: { actions: '<button type="button">Details</button>' },
  })
}

describe('CourseCard', () => {
  it('presents the trustworthy course context in a single responsive card', () => {
    const wrapper = mountCard({ thumbnailUrl: 'https://cdn.test/fingerstyle.png' })

    expect(wrapper.get('[data-test="course-card-label"]').text()).toBe('Course')
    expect(wrapper.get('img').attributes('src')).toBe('https://cdn.test/fingerstyle.png')
    expect(wrapper.get('[data-test="course-summary"]').classes()).toContain('line-clamp-2')
    expect(wrapper.get('[data-test="course-byline"]').text()).toContain('Bob Martins')
    expect(wrapper.get('[data-test="course-language"]').text()).toContain('EN')
    expect(wrapper.get('[data-test="course-level"]').text()).toBe('Beginner')
    expect(wrapper.get('[data-test="course-lessons"]').text()).toBe('12 lessons')
    expect(wrapper.get('[data-test="course-checkpoints"]').text()).toBe('3 learning paths')
    expect(wrapper.get('[data-test="course-card-actions"]').text()).toContain('Details')
  })

  it('labels a learning path as a path, with lessons and no checkpoint count', () => {
    const wrapper = mountCard({ kind: 'path', checkpointCount: undefined })

    expect(wrapper.get('[data-test="course-card-label"]').text()).toBe('Path')
    expect(wrapper.get('[data-test="course-lessons"]').text()).toBe('12 lessons')
    expect(wrapper.find('[data-test="course-checkpoints"]').exists()).toBe(false)
  })

  it('leaves out the level and summary a path copy made before snapshots lacks', () => {
    const wrapper = mountCard({ kind: 'path', level: undefined, summary: undefined })

    expect(wrapper.find('[data-test="course-level"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="course-summary"]').exists()).toBe(false)
  })

  it('uses the intentional placeholder when the course has no image', () => {
    expect(mountCard().find('[data-test="thumbnail-placeholder"]').exists()).toBe(true)
  })

  it('keeps the card usable when a legacy response lacks presentation metadata', () => {
    const wrapper = mountCard({ createdBy: undefined, checkpointCount: undefined })

    expect(wrapper.find('[data-test="course-byline"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="course-checkpoints"]').exists()).toBe(false)
  })
})
