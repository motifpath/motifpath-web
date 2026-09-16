import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PracticeHelpModal from '@/features/student/components/PracticeHelpModal.vue'

describe('PracticeHelpModal', () => {
  it('renders nothing when closed', () => {
    const wrapper = mount(PracticeHelpModal, {
      props: { open: false, exerciseType: 'text_response', allowMultiple: false },
    })

    expect(wrapper.find('[data-test="modal-overlay"]').exists()).toBe(false)
  })

  it('emits close when the close button is clicked', async () => {
    const wrapper = mount(PracticeHelpModal, {
      props: { open: true, exerciseType: 'text_response', allowMultiple: false },
    })

    await wrapper.get('[data-test="close-modal"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close when the overlay is clicked', async () => {
    const wrapper = mount(PracticeHelpModal, {
      props: { open: true, exerciseType: 'text_response', allowMultiple: false },
    })

    await wrapper.get('[data-test="modal-overlay"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('describes single-answer text/audio questions as pick-one', () => {
    const wrapper = mount(PracticeHelpModal, {
      props: { open: true, exerciseType: 'text_response', allowMultiple: false },
    })

    expect(wrapper.text().toLowerCase()).toContain('tap the option')
    expect(wrapper.text().toLowerCase()).not.toContain('every option')
  })

  it('describes multi-answer text/audio questions as pick-all-that-apply', () => {
    const wrapper = mount(PracticeHelpModal, {
      props: { open: true, exerciseType: 'audio_recognition', allowMultiple: true },
    })

    expect(wrapper.text().toLowerCase()).toContain('every option that applies')
  })

  it('describes image_recognition as tapping marked areas on the image', () => {
    const wrapper = mount(PracticeHelpModal, {
      props: { open: true, exerciseType: 'image_recognition', allowMultiple: false },
    })

    expect(wrapper.text().toLowerCase()).toContain('image')
    expect(wrapper.text().toLowerCase()).toContain('area')
  })

  it('describes image_choice as tapping an image', () => {
    const wrapper = mount(PracticeHelpModal, {
      props: { open: true, exerciseType: 'image_choice', allowMultiple: false },
    })

    expect(wrapper.text().toLowerCase()).toContain('tap the image')
  })

  it('always mentions Back for revisiting a prior answer, regardless of type', () => {
    const wrapper = mount(PracticeHelpModal, {
      props: { open: true, exerciseType: 'image_choice', allowMultiple: false },
    })

    expect(wrapper.text()).toContain('‹ Back')
  })
})
