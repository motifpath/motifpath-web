import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import { i18n } from '@/i18n'

// `reactive()` mirrors Pinia's own auto-unwrapping of a setup store's refs.
const currentUser = reactive<{ profile: { display_name?: string } | null }>({
  profile: { display_name: 'Ana Souza' },
})
vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => currentUser,
}))

import SendToTeacher from '@/features/student/components/SendToTeacher.vue'

enableAutoUnmount(afterEach)

const lessonProps = {
  reference: 'L-3eb9ccc1',
  pathTitle: 'Blues Basics',
  lessonTitle: 'Shuffle in E',
}

function mountButton(props: Partial<typeof lessonProps & { raised: boolean }> = {}) {
  // Attached, so isVisible() reads the tooltip's computed display.
  return mount(SendToTeacher, { props: { ...lessonProps, ...props }, attachTo: document.body })
}

/** The prefilled message carried by the link's `text` query parameter. */
function prefilledMessage(wrapper: ReturnType<typeof mountButton>): string {
  const href = wrapper.get('[data-test="send-to-teacher"]').attributes('href') ?? ''
  return new URL(href).searchParams.get('text') ?? ''
}

describe('SendToTeacher', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_CONCIERGE_WHATSAPP_NUMBER', '+55 11 91234-5678')
    currentUser.profile = { display_name: 'Ana Souza' }
    i18n.global.locale.value = 'en'
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    i18n.global.locale.value = 'en'
  })

  it('is a floating WhatsApp icon named "Send to your teacher"', () => {
    const link = mountButton().get('[data-test="send-to-teacher"]')

    expect(link.attributes('aria-label')).toBe('Send to your teacher')
    expect(link.text()).toBe('')
    expect(link.find('[data-test="whatsapp-icon"]').exists()).toBe(true)
  })

  it('floats in the bottom-right corner, higher when raised above a bottom bar', () => {
    const resting = mountButton().get('[data-test="send-to-teacher-float"]')
    const raised = mountButton({ raised: true }).get('[data-test="send-to-teacher-float"]')

    expect(resting.classes()).toEqual(expect.arrayContaining(['fixed', 'right-4', 'bottom-4']))
    expect(raised.classes()).toEqual(expect.arrayContaining(['fixed', 'right-4', 'bottom-20']))
  })

  it('opens the concierge number on wa.me outside the app', () => {
    const link = mountButton().get('[data-test="send-to-teacher"]')

    expect(link.attributes('href')).toMatch(/^https:\/\/wa\.me\/5511912345678\?text=/)
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })

  it('hides its tooltip until hovered or focused', () => {
    const wrapper = mountButton()

    expect(wrapper.get('[role="tooltip"]').isVisible()).toBe(false)
  })

  it('shows its label and where the message goes while a mouse hovers it', async () => {
    const wrapper = mountButton()
    const link = wrapper.get('[data-test="send-to-teacher"]')

    await link.trigger('pointerenter', { pointerType: 'mouse' })

    const tooltip = wrapper.get('[role="tooltip"]')
    expect(tooltip.isVisible()).toBe(true)
    expect(tooltip.text()).toContain('Send to your teacher')
    expect(tooltip.text()).toContain('Opens WhatsApp. Your message goes to the MotifPath team.')

    await link.trigger('pointerleave', { pointerType: 'mouse' })

    expect(tooltip.isVisible()).toBe(false)
  })

  it('shows no tooltip for a touch, which opens WhatsApp straight away', async () => {
    const wrapper = mountButton()

    await wrapper.get('[data-test="send-to-teacher"]').trigger('pointerenter', { pointerType: 'touch' })

    expect(wrapper.get('[role="tooltip"]').isVisible()).toBe(false)
  })

  it('shows its tooltip while it has keyboard focus', async () => {
    const wrapper = mountButton()
    const link = wrapper.get('[data-test="send-to-teacher"]')

    await link.trigger('focus')
    expect(wrapper.get('[role="tooltip"]').isVisible()).toBe(true)

    await link.trigger('blur')
    expect(wrapper.get('[role="tooltip"]').isVisible()).toBe(false)
  })

  it('shows no tooltip for the focus a tap or click gives it', async () => {
    const wrapper = mountButton()
    const link = wrapper.get('[data-test="send-to-teacher"]')

    await link.trigger('pointerdown', { pointerType: 'touch' })
    await link.trigger('focus')

    expect(wrapper.get('[role="tooltip"]').isVisible()).toBe(false)
  })

  it('describes itself with the tooltip for assistive technology', () => {
    const wrapper = mountButton()

    const tooltipId = wrapper.get('[role="tooltip"]').attributes('id')
    expect(tooltipId).toBeTruthy()
    expect(wrapper.get('[data-test="send-to-teacher"]').attributes('aria-describedby')).toBe(tooltipId)
  })

  it('prefills the student, the path, the lesson and the reference', () => {
    expect(prefilledMessage(mountButton())).toBe(
      [
        "Hi! I'm Ana Souza.",
        'Path: Blues Basics',
        'Lesson: Shuffle in E',
        'Ref: L-3eb9ccc1',
        '',
        'My question or recording:',
      ].join('\n'),
    )
  })

  it('carries whatever reference it is given', () => {
    const message = prefilledMessage(mountButton({ reference: 'X-3eb9ccc1/5c20a7e4' }))

    expect(message).toContain('Ref: X-3eb9ccc1/5c20a7e4')
  })

  it('greets without a name when the student has no display name', () => {
    currentUser.profile = {}

    const message = prefilledMessage(mountButton())

    expect(message.split('\n')[0]).toBe('Hi!')
    expect(message).not.toContain("I'm")
  })

  it('leaves out a title it does not know yet', () => {
    const message = prefilledMessage(mountButton({ pathTitle: undefined }))

    expect(message).not.toContain('Path:')
    expect(message).toContain('Lesson: Shuffle in E')
  })

  it('writes the label, the hint and the message in Portuguese for a pt-BR interface', () => {
    i18n.global.locale.value = 'pt-BR'

    const wrapper = mountButton()

    expect(wrapper.get('[data-test="send-to-teacher"]').attributes('aria-label')).toBe('Enviar ao professor')
    expect(prefilledMessage(wrapper)).toBe(
      [
        'Olá! Sou Ana Souza.',
        'Trilha: Blues Basics',
        'Lição: Shuffle in E',
        'Ref: L-3eb9ccc1',
        '',
        'Minha dúvida ou gravação:',
      ].join('\n'),
    )
  })

  it('renders nothing when no concierge number is configured', () => {
    vi.stubEnv('VITE_CONCIERGE_WHATSAPP_NUMBER', '')

    const wrapper = mountButton()

    expect(wrapper.find('[data-test="send-to-teacher"]').exists()).toBe(false)
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)
  })
})
