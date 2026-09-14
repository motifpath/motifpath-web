import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const POST = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST }, eventApi: {} }),
}))

import ExerciseAuthoringView from '@/features/teacher/views/ExerciseAuthoringView.vue'

describe('ExerciseAuthoringView', () => {
  beforeEach(() => {
    POST.mockReset()
  })

  it('starts on text_response with the validation banner showing (no correct option yet)', () => {
    const wrapper = mount(ExerciseAuthoringView)

    expect(wrapper.find('[data-test="no-correct-banner"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'TextOptionsEditor' }).exists()).toBe(true)
  })

  it('switches editors when the exercise type tab changes', async () => {
    const wrapper = mount(ExerciseAuthoringView)

    await wrapper.get('[data-test="type-tab-image_recognition"]').trigger('click')
    expect(wrapper.findComponent({ name: 'ImageRegionEditor' }).exists()).toBe(true)

    await wrapper.get('[data-test="type-tab-image_choice"]').trigger('click')
    expect(wrapper.findComponent({ name: 'ImageChoiceOptionsEditor' }).exists()).toBe(true)

    await wrapper.get('[data-test="type-tab-audio_recognition"]').trigger('click')
    expect(wrapper.findComponent({ name: 'TextOptionsEditor' }).exists()).toBe(true)
  })

  it('adds and removes skill tags', async () => {
    const wrapper = mount(ExerciseAuthoringView)

    const input = wrapper.get('input[placeholder="Type a skill and press Enter"]')
    await input.setValue('technique')
    await input.trigger('keydown.enter')

    expect(wrapper.text()).toContain('technique')
  })

  it('disables save until at least one option is marked correct', async () => {
    const wrapper = mount(ExerciseAuthoringView)
    await wrapper.get('input[placeholder="Untitled exercise"]').setValue('title')

    const saveButton = wrapper.get('[data-test="save-exercise"]')
    expect(saveButton.attributes('disabled')).toBeDefined()
    expect(POST).not.toHaveBeenCalled()
  })

  it('creates the exercise on save and shows a success message', async () => {
    POST.mockResolvedValueOnce({
      data: { exercise_id: 'e-1', challenge_ids: [] },
      error: undefined,
      response: { status: 201 },
    })
    const wrapper = mount(ExerciseAuthoringView)

    await wrapper.get('input[placeholder="Untitled exercise"]').setValue('Name the chord')
    await wrapper.get('textarea').setValue('Name this chord shape')
    await wrapper.get('[data-test="add-option"]').trigger('click')
    const optionInput = wrapper.get('input[placeholder="Option text"]')
    await optionInput.setValue('G major')
    await wrapper.get('[data-test="option-correct"]').trigger('click')

    await wrapper.get('[data-test="save-exercise"]').trigger('click')
    await flushPromises()

    expect(POST).toHaveBeenCalledWith('/exercises', {
      body: expect.objectContaining({
        title: 'Name the chord',
        prompt: 'Name this chord shape',
        exercise_type: 'text_response',
        options: [expect.objectContaining({ is_correct: true, label: 'G major' })],
      }),
    })
    expect(wrapper.find('[data-test="save-success"]').exists()).toBe(true)
  })

  it('shows an error message when saving fails', async () => {
    POST.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 400 } })
    const wrapper = mount(ExerciseAuthoringView)

    await wrapper.get('input[placeholder="Untitled exercise"]').setValue('title')
    await wrapper.get('textarea').setValue('prompt')
    await wrapper.get('[data-test="add-option"]').trigger('click')
    await wrapper.get('[data-test="option-correct"]').trigger('click')

    await wrapper.get('[data-test="save-exercise"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="save-error"]').exists()).toBe(true)
  })

  it('opens the student preview modal', async () => {
    const wrapper = mount(ExerciseAuthoringView)

    await wrapper.get('[data-test="open-preview"]').trigger('click')

    expect(wrapper.find('[data-test="student-preview-modal"]').exists()).toBe(true)
  })
})
