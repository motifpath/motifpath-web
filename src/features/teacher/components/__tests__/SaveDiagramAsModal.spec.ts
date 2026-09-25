import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SaveDiagramAsModal from '@/features/teacher/components/SaveDiagramAsModal.vue'

interface Props {
  open: boolean
  languages: string[]
  initialNames: Record<string, string>
  asTemplate: boolean
  saving: boolean
}

function mountModal(props: Partial<Props> = {}) {
  return mount(SaveDiagramAsModal, {
    props: {
      open: true,
      languages: ['en', 'pt_BR'],
      initialNames: { en: 'Minor Pentatonic (copy)', pt_BR: 'Pentatônica menor (cópia)' },
      asTemplate: false,
      saving: false,
      ...props,
    },
  })
}

const nameInput = (wrapper: ReturnType<typeof mountModal>, code: string) =>
  wrapper.get<HTMLInputElement>(`[data-test="save-as-name-${code}"]`)

describe('SaveDiagramAsModal', () => {
  it('renders nothing while closed', () => {
    expect(mountModal({ open: false }).find('[data-test="save-as-form"]').exists()).toBe(false)
  })

  it('asks for a name in each language, labelled and pre-filled', () => {
    const wrapper = mountModal()

    expect(nameInput(wrapper, 'en').element.value).toBe('Minor Pentatonic (copy)')
    expect(nameInput(wrapper, 'pt_BR').element.value).toBe('Pentatônica menor (cópia)')
    expect(wrapper.text()).toContain('English')
    expect(wrapper.text()).toContain('Portuguese')
  })

  it('asks only for the languages it is given', () => {
    const wrapper = mountModal({ languages: ['pt_BR'], initialNames: { pt_BR: 'Escala (cópia)' } })

    expect(wrapper.find('[data-test="save-as-name-en"]').exists()).toBe(false)
    expect(nameInput(wrapper, 'pt_BR').element.value).toBe('Escala (cópia)')
  })

  it('titles itself for a copy or for a template', () => {
    expect(mountModal().text()).toContain('Save a copy')
    expect(mountModal({ asTemplate: true }).text()).toContain('Save as template')
  })

  it('confirms with every name, trimmed', async () => {
    const wrapper = mountModal()

    await nameInput(wrapper, 'en').setValue('  My Pentatonic  ')
    await nameInput(wrapper, 'pt_BR').setValue(' Minha pentatônica ')
    await wrapper.get('[data-test="save-as-form"]').trigger('submit')

    expect(wrapper.emitted('confirm')).toEqual([[{ en: 'My Pentatonic', pt_BR: 'Minha pentatônica' }]])
  })

  it('cannot confirm while any language is left blank, or while saving', async () => {
    const wrapper = mountModal()
    await nameInput(wrapper, 'pt_BR').setValue('   ')
    await wrapper.get('[data-test="save-as-form"]').trigger('submit')
    expect(wrapper.get('[data-test="save-as-confirm"]').attributes('disabled')).toBeDefined()
    expect(wrapper.emitted('confirm')).toBeUndefined()

    const saving = mountModal({ saving: true })
    await saving.get('[data-test="save-as-form"]').trigger('submit')
    expect(saving.emitted('confirm')).toBeUndefined()
  })

  it('closes from its cancel button', async () => {
    const wrapper = mountModal()

    await wrapper.get('[data-test="save-as-cancel"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('resets to the suggested names each time it reopens', async () => {
    const wrapper = mountModal()
    await nameInput(wrapper, 'en').setValue('Something else')

    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true, initialNames: { en: 'Scale (copy)', pt_BR: 'Escala (cópia)' } })

    expect(nameInput(wrapper, 'en').element.value).toBe('Scale (copy)')
  })
})
