import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

const signOut = vi.fn(async () => {})
vi.mock('@/features/auth/composables/useAuth', () => ({ useAuth: () => ({ signOut }) }))

import NameStepForm from '@/features/auth/components/NameStepForm.vue'

const blank = { template: '<div />' }

async function mountForm(initial: { firstName: string; lastName: string }, submit = vi.fn<(firstName: string, lastName: string) => Promise<void>>(async () => {})) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: blank },
      { path: '/welcome/name', name: 'name-step', component: blank },
    ],
  })
  await router.push('/welcome/name')
  const wrapper = mount(NameStepForm, { props: { initial, submit }, global: { plugins: [router] }, attachTo: document.body })
  return { wrapper, submit, router }
}

function fields(wrapper: Awaited<ReturnType<typeof mountForm>>['wrapper']) {
  const inputs = wrapper.findAll('input')
  return { first: inputs[0], last: inputs[1] }
}

describe('NameStepForm', () => {
  beforeEach(() => {
    signOut.mockClear()
  })

  it('asks what to call the visitor, with what Google gave filled in', async () => {
    const { wrapper } = await mountForm({ firstName: 'Dora', lastName: '' })

    expect(wrapper.get('h1').text()).toBe('What should we call you?')
    expect(fields(wrapper).first.element.value).toBe('Dora')
    expect(fields(wrapper).last.element.value).toBe('')
    wrapper.unmount()
  })

  it('puts the cursor in the name that is missing', async () => {
    const { wrapper } = await mountForm({ firstName: 'Dora', lastName: '' })

    expect(document.activeElement).toBe(fields(wrapper).last.element)
    wrapper.unmount()
  })

  it('sends both names, trimmed, on Continue', async () => {
    const { wrapper, submit } = await mountForm({ firstName: 'Dora', lastName: '' })

    await fields(wrapper).last.setValue('  Silva ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(submit).toHaveBeenCalledWith('Dora', 'Silva')
    wrapper.unmount()
  })

  it('needs both names before sending anything', async () => {
    const { wrapper, submit } = await mountForm({ firstName: 'Dora', lastName: '' })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(submit).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Enter your last name.')
    expect(fields(wrapper).last.attributes('aria-invalid')).toBe('true')
    wrapper.unmount()
  })

  it('keeps what was typed and says so when the name could not be saved', async () => {
    const failing = vi.fn(async () => {
      throw new Error('network')
    })
    const { wrapper } = await mountForm({ firstName: 'Dora', lastName: '' }, failing)

    await fields(wrapper).last.setValue('Silva')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain("We couldn't save your name. Try again.")
    expect(fields(wrapper).first.element.value).toBe('Dora')
    expect(fields(wrapper).last.element.value).toBe('Silva')
    wrapper.unmount()
  })

  it('signs out and goes back to the landing as the quiet way out', async () => {
    const { wrapper, router } = await mountForm({ firstName: 'Dora', lastName: '' })

    await wrapper.get('[data-test="name-step-sign-out"]').trigger('click')
    await flushPromises()

    expect(signOut).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.name).toBe('home')
    wrapper.unmount()
  })
})
