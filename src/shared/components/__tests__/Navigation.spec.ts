import { mount, RouterLinkStub } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import { i18n } from '@/i18n'
import NavigationBar from '@/shared/components/NavigationBar.vue'
import NavigationRail from '@/shared/components/NavigationRail.vue'
import NavigationSidebar from '@/shared/components/NavigationSidebar.vue'
import type { DestinationId } from '@/shared/navigation'

const CONTAINERS = [
  ['bar', NavigationBar],
  ['rail', NavigationRail],
  ['sidebar', NavigationSidebar],
] as const

function mountContainer(component: (typeof CONTAINERS)[number][1], props: { current: DestinationId | null; showTeach?: boolean }) {
  return mount(component, {
    props,
    slots: { account: '<button data-test="account-slot">Account</button>' },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

function destinationLinks(wrapper: ReturnType<typeof mountContainer>) {
  return wrapper.findAll('[data-test="nav-destination"]')
}

afterEach(() => {
  i18n.global.locale.value = 'en'
})

describe.each(CONTAINERS)('the navigation %s', (_, component) => {
  it('shows Home, Practice, My path, Learning and Discover, in that order', () => {
    const wrapper = mountContainer(component, { current: 'home' })

    expect(destinationLinks(wrapper).map((link) => link.text())).toEqual([
      'Home',
      'Practice',
      'My path',
      'Learning',
      'Discover',
    ])
  })

  it('links each destination to its place', () => {
    const wrapper = mountContainer(component, { current: 'home' })

    const targets = wrapper
      .findAllComponents(RouterLinkStub)
      .filter((link) => link.attributes('data-test') === 'nav-destination')
      .map((link) => link.props('to'))

    expect(targets).toEqual([
      { name: 'home' },
      { name: 'practice-session' },
      { name: 'path' },
      { name: 'my-courses' },
      { name: 'course-catalog' },
    ])
  })

  it('marks the current destination by more than colour: aria-current and an indicator', () => {
    const wrapper = mountContainer(component, { current: 'myPath' })

    const links = destinationLinks(wrapper)
    expect(links.map((link) => link.attributes('aria-current') ?? null)).toEqual([null, null, 'page', null, null])
    expect(links.map((link) => link.find('[data-test="nav-indicator"]').exists())).toEqual([
      false,
      false,
      true,
      false,
      false,
    ])
  })

  it('marks nothing on a page outside the five', () => {
    const wrapper = mountContainer(component, { current: null })

    expect(wrapper.find('[aria-current="page"]').exists()).toBe(false)
  })

  it('is a labelled navigation landmark', () => {
    const wrapper = mountContainer(component, { current: 'home' })

    expect(wrapper.find('nav').attributes('aria-label')).toBe('Main')
  })

  it('uses the Portuguese labels', () => {
    i18n.global.locale.value = 'pt-BR'
    const wrapper = mountContainer(component, { current: 'home' })

    expect(destinationLinks(wrapper).map((link) => link.text())).toEqual([
      'Início',
      'Praticar',
      'Trilha',
      'Aprender',
      'Explorar',
    ])
  })
})

describe('the navigation bar', () => {
  it('has no menu button', () => {
    const wrapper = mountContainer(NavigationBar, { current: 'home' })

    expect(wrapper.find('button').exists()).toBe(false)
  })
})

describe.each([
  ['rail', NavigationRail],
  ['sidebar', NavigationSidebar],
] as const)('the navigation %s', (_, component) => {
  it('puts the account entry at its foot', () => {
    const wrapper = mountContainer(component, { current: 'home' })

    expect(wrapper.find('[data-test="account-slot"]').exists()).toBe(true)
  })
})

describe('the navigation sidebar', () => {
  it('offers Teach to an author, apart from the learner destinations', () => {
    const wrapper = mountContainer(NavigationSidebar, { current: 'home', showTeach: true })

    const teach = wrapper.findAllComponents(RouterLinkStub).find((link) => link.attributes('data-test') === 'nav-teach')
    expect(teach?.text()).toBe('Teach')
    expect(teach?.props('to')).toEqual({ name: 'teacher-content' })
    expect(wrapper.find('[data-test="nav-teach-divider"]').exists()).toBe(true)
  })

  it('never offers Teach to a student', () => {
    const wrapper = mountContainer(NavigationSidebar, { current: 'home', showTeach: false })

    expect(wrapper.find('[data-test="nav-teach"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="nav-teach-divider"]').exists()).toBe(false)
  })
})
