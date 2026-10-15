import { mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'

import TeachHomeView from '@/features/teacher/views/TeachHomeView.vue'
import { mockViewport } from '@/shared/testUtils/viewport'
import { useCurrentUserStore } from '@/stores/currentUser'

function mountHome(role: 'teacher' | 'admin') {
  mockViewport(390)
  const pinia = createPinia()
  setActivePinia(pinia)
  useCurrentUserStore().profile = {
    user_id: '00000000-0000-4000-8000-000000000001',
    role,
    display_name: 'Ana Souza',
    locale: { code: 'en', name: 'English' },
    registered_at: '2026-01-01T00:00:00Z',
  }
  return mount(TeachHomeView, {
    global: { plugins: [pinia], stubs: { RouterLink: RouterLinkStub, TeachShell: { template: '<div><slot /></div>' } } },
  })
}

const rows = (wrapper: ReturnType<typeof mountHome>) =>
  wrapper.findAllComponents(RouterLinkStub).filter((l) => l.attributes('data-test') === 'teach-home-section')

describe('TeachHomeView', () => {
  it('says what Teach is for, and offers one row per section, in the order things are composed', () => {
    const wrapper = mountHome('teacher')

    expect(wrapper.get('h1').text()).toBe('Teach')
    expect(wrapper.text()).toContain('Build and look after what your students learn.')
    expect(rows(wrapper).map((r) => r.text())).toEqual(['Courses', 'Paths', 'Lessons', 'Exercises', 'Diagrams'])
    expect(rows(wrapper)[2]!.props('to')).toEqual({ name: 'teacher-content' })
    expect(wrapper.find('[data-test="teach-home-admin"]').exists()).toBe(false)
  })

  it('adds an Admin group for an admin', () => {
    const wrapper = mountHome('admin')

    expect(wrapper.get('[data-test="teach-home-admin"]').text()).toBe('Admin')
    expect(rows(wrapper).map((r) => r.text()).slice(5)).toEqual(['Knowledge map', 'Song charts', 'Engagement'])
    expect(rows(wrapper)[6]!.props('to')).toEqual({ name: 'admin-song-charts' })
    expect(rows(wrapper)[7]!.props('to')).toEqual({ name: 'admin-alpha' })
  })
})
