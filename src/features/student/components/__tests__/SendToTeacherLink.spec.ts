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

import SendToTeacherLink from '@/features/student/components/SendToTeacherLink.vue'

enableAutoUnmount(afterEach)

const practiceProps = {
  reference: 'X-3eb9ccc1/5c20a7e4',
  pathTitle: 'Blues Basics',
  lessonTitle: 'Shuffle in E',
}

function mountLink(props: Partial<typeof practiceProps> = {}) {
  return mount(SendToTeacherLink, { props: { ...practiceProps, ...props } })
}

describe('SendToTeacherLink', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_CONCIERGE_WHATSAPP_NUMBER', '+55 11 91234-5678')
    currentUser.profile = { display_name: 'Ana Souza' }
    i18n.global.locale.value = 'en'
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    i18n.global.locale.value = 'en'
  })

  it('is a "Send to your teacher" link with the WhatsApp icon, not a floating button', () => {
    const wrapper = mountLink()

    const link = wrapper.get('[data-test="send-to-teacher-link"]')
    expect(link.text()).toBe('Send to your teacher')
    expect(link.find('[data-test="whatsapp-icon"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="send-to-teacher-float"]').exists()).toBe(false)
  })

  it('opens the concierge number on wa.me outside the app', () => {
    const link = mountLink().get('[data-test="send-to-teacher-link"]')

    expect(link.attributes('href')).toMatch(/^https:\/\/wa\.me\/5511912345678\?text=/)
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })

  it('prefills the student, the path, the lesson and the exercise reference', () => {
    const href = mountLink().get('[data-test="send-to-teacher-link"]').attributes('href') ?? ''

    expect(new URL(href).searchParams.get('text')).toBe(
      [
        "Hi! I'm Ana Souza.",
        'Path: Blues Basics',
        'Lesson: Shuffle in E',
        'Ref: X-3eb9ccc1/5c20a7e4',
        '',
        'My question or recording:',
      ].join('\n'),
    )
  })

  it('tells assistive technology where the message goes', () => {
    const wrapper = mountLink()

    const describedBy = wrapper.get('[data-test="send-to-teacher-link"]').attributes('aria-describedby')
    expect(wrapper.get(`[id="${describedBy}"]`).text()).toBe('Opens WhatsApp. Your message goes to the MotifPath team.')
  })

  it('reads in Portuguese for a pt-BR interface', () => {
    i18n.global.locale.value = 'pt-BR'

    expect(mountLink().get('[data-test="send-to-teacher-link"]').text()).toBe('Enviar ao professor')
  })

  it('renders nothing when no concierge number is configured', () => {
    vi.stubEnv('VITE_CONCIERGE_WHATSAPP_NUMBER', '')

    expect(mountLink().find('[data-test="send-to-teacher-link"]').exists()).toBe(false)
  })
})
