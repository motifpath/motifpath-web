import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import type * as VueRouter from 'vue-router'

import { i18n } from '@/i18n'

const route = reactive<{ name: string }>({ name: 'course-catalog' })
const replace = vi.fn()
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return { ...actual, useRoute: () => route, useRouter: () => ({ replace }) }
})

const { default: DiscoverSwitch } = await import('@/shared/components/DiscoverSwitch.vue')

const segment = (wrapper: ReturnType<typeof mount>, value: string) => wrapper.get(`[data-test="discover-${value}"]`)

describe('DiscoverSwitch', () => {
  afterEach(() => {
    replace.mockClear()
    route.name = 'course-catalog'
    i18n.global.locale.value = 'en'
  })

  it('offers Courses | Paths, Courses first', () => {
    const wrapper = mount(DiscoverSwitch)

    expect(wrapper.findAll('[role="radio"]').map((radio) => radio.text())).toEqual(['Courses', 'Paths'])
  })

  it('has Courses chosen on the course catalog', () => {
    const wrapper = mount(DiscoverSwitch)

    expect(segment(wrapper, 'courses').attributes('aria-checked')).toBe('true')
    expect(segment(wrapper, 'paths').attributes('aria-checked')).toBe('false')
  })

  it('has Paths chosen on the path catalog', () => {
    route.name = 'path-catalog'
    const wrapper = mount(DiscoverSwitch)

    expect(segment(wrapper, 'paths').attributes('aria-checked')).toBe('true')
  })

  it('switches to the path catalog in place, so Back does not step through the segments', async () => {
    const wrapper = mount(DiscoverSwitch)

    await segment(wrapper, 'paths').trigger('click')

    expect(replace).toHaveBeenCalledWith({ name: 'path-catalog' })
  })

  it('switches back to the course catalog', async () => {
    route.name = 'path-catalog'
    const wrapper = mount(DiscoverSwitch)

    await segment(wrapper, 'courses').trigger('click')

    expect(replace).toHaveBeenCalledWith({ name: 'course-catalog' })
  })

  it('uses the Portuguese labels', () => {
    i18n.global.locale.value = 'pt-BR'
    const wrapper = mount(DiscoverSwitch)

    expect(wrapper.findAll('[role="radio"]').map((radio) => radio.text())).toEqual(['Cursos', 'Trilhas'])
  })
})
