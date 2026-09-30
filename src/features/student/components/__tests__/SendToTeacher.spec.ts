import { mount } from '@vue/test-utils'
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

const lessonProps = {
  reference: 'L-3eb9ccc1',
  pathTitle: 'Blues Basics',
  lessonTitle: 'Shuffle in E',
}

function mountButton(props: Partial<typeof lessonProps> = {}) {
  return mount(SendToTeacher, { props: { ...lessonProps, ...props } })
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

  it('offers a "Send to your teacher" link', () => {
    const wrapper = mountButton()

    expect(wrapper.get('[data-test="send-to-teacher"]').text()).toBe('Send to your teacher')
  })

  it('opens the concierge number on wa.me outside the app', () => {
    const link = mountButton().get('[data-test="send-to-teacher"]')

    expect(link.attributes('href')).toMatch(/^https:\/\/wa\.me\/5511912345678\?text=/)
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })

  it('says where the message goes', () => {
    const wrapper = mountButton()

    expect(wrapper.get('[data-test="send-to-teacher-hint"]').text()).toBe(
      'Opens WhatsApp. Your message goes to the MotifPath team.',
    )
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

    expect(wrapper.get('[data-test="send-to-teacher"]').text()).toBe('Enviar ao professor')
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
    expect(wrapper.find('[data-test="send-to-teacher-hint"]').exists()).toBe(false)
  })
})
