import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import HowToAnswer from '@/features/student/components/HowToAnswer.vue'

type Props = InstanceType<typeof HowToAnswer>['$props']

async function openFor(props: Props) {
  const wrapper = mount(HowToAnswer, { props })
  await wrapper.get('[data-test="how-to-answer-toggle"]').trigger('click')
  return wrapper
}

describe('HowToAnswer', () => {
  it('starts closed, as a "How to answer" toggle', () => {
    const wrapper = mount(HowToAnswer, { props: { exerciseType: 'text_response', allowMultiple: false } })

    const toggle = wrapper.get('[data-test="how-to-answer-toggle"]')
    expect(toggle.text()).toContain('How to answer')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[data-test="how-to-answer-body"]').exists()).toBe(false)
  })

  it('opens in place, not as a dialog, and closes again', async () => {
    const wrapper = await openFor({ exerciseType: 'text_response', allowMultiple: false })

    const toggle = wrapper.get('[data-test="how-to-answer-toggle"]')
    const body = wrapper.get('[data-test="how-to-answer-body"]')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(toggle.attributes('aria-controls')).toBe(body.attributes('id'))
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    await toggle.trigger('click')

    expect(wrapper.find('[data-test="how-to-answer-body"]').exists()).toBe(false)
  })

  it('says to choose then go on with Next, and that an answer can be changed until the end', async () => {
    const wrapper = await openFor({ exerciseType: 'text_response', allowMultiple: false })

    expect(wrapper.text()).toContain(
      'Then tap Next. You can go back and change an answer until you finish; the one you move on with is the one that counts.',
    )
  })

  it('describes a one-answer option list as tapping the option', async () => {
    const wrapper = await openFor({ exerciseType: 'text_response', allowMultiple: false })

    expect(wrapper.text()).toContain('Tap the option that answers the prompt.')
  })

  it('describes a several-answer option list as tapping every option that applies', async () => {
    const wrapper = await openFor({ exerciseType: 'audio_recognition', allowMultiple: true })

    expect(wrapper.text()).toContain('Tap every option that applies.')
  })

  it('describes image_recognition as tapping areas on the image, without implying they are visibly marked', async () => {
    const wrapper = await openFor({ exerciseType: 'image_recognition', allowMultiple: false })

    expect(wrapper.text()).toContain('Tap the area on the image that answers the prompt.')
    expect(wrapper.text().toLowerCase()).not.toContain('marked')
  })

  it('describes a diagram stimulus as tapping markers on the diagram, not areas on an image', async () => {
    const single = await openFor({ exerciseType: 'image_recognition', allowMultiple: false, diagramStimulus: true })
    const multiple = await openFor({ exerciseType: 'image_recognition', allowMultiple: true, diagramStimulus: true })

    expect(single.text()).toContain('Tap the marker on the diagram that answers the prompt.')
    expect(multiple.text()).toContain('Tap every marker on the diagram that answers the prompt.')
    expect(single.text().toLowerCase()).not.toContain('area')
  })

  it('describes image_choice as tapping an image', async () => {
    const wrapper = await openFor({ exerciseType: 'image_choice', allowMultiple: false })

    expect(wrapper.text()).toContain('Tap the image that answers the prompt.')
  })
})
