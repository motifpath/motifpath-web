import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

const POST = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST }, eventApi: {} }),
}))

const upload = vi.fn()
vi.mock('@/features/teacher/composables/useMediaUpload', () => ({
  useMediaUpload: () => ({ upload }),
}))

// Defaults to a teacher, matching this route's normal caller — individual
// tests override .role for the permission-gating cases.
const currentUser = reactive({ profile: { role: 'teacher' as 'student' | 'teacher' | 'admin' } })
vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => currentUser,
}))

vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => ({
    isLoaded: { value: true },
    isSignedIn: { value: true },
    getToken: async () => 'jwt',
    signOut: vi.fn(async () => {}),
    displayInitial: { value: 'G' },
  }),
}))

vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:local-preview'), revokeObjectURL: vi.fn() })

function mockMatchMedia(compact: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: compact,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

function mountView() {
  return mount(ExerciseAuthoringView, {
    global: {
      plugins: [createPinia()],
      stubs: { RouterLink: RouterLinkStub },
    },
  })
}

import ImagePickerModal from '@/features/teacher/components/ImagePickerModal.vue'
import ExerciseAuthoringView from '@/features/teacher/views/ExerciseAuthoringView.vue'

async function fillMinimalTextResponse(wrapper: ReturnType<typeof mountView>) {
  await wrapper.get('input[placeholder="Untitled exercise"]').setValue('Name the chord')
  await wrapper.get('textarea').setValue('Name this chord shape')
  await wrapper.get('[data-test="add-option"]').trigger('click')
  await wrapper.get('input[placeholder="Option text"]').setValue('G major')
  await wrapper.get('[data-test="option-correct"]').trigger('click')
}

describe('ExerciseAuthoringView', () => {
  beforeEach(() => {
    POST.mockReset()
    upload.mockReset()
    currentUser.profile.role = 'teacher'
    window.localStorage.clear()
    document.documentElement.classList.remove('dark')
    mockMatchMedia(false)
  })

  it('renders the AppBar in teacher context with a New exercise breadcrumb', () => {
    const wrapper = mountView()

    expect(wrapper.findComponent({ name: 'AppBar' }).props('context')).toBe('teacher')
    expect(wrapper.text()).toContain('New exercise')
  })

  it('starts on text_response with the validation banner showing (no correct option yet)', () => {
    const wrapper = mountView()

    expect(wrapper.find('[data-test="no-correct-banner"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'TextOptionsEditor' }).exists()).toBe(true)
  })

  it('stacks main content above the sidebar instead of side by side when compact', async () => {
    mockMatchMedia(true)
    const wrapper = mountView()
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-test="authoring-body"]').classes()).toContain('flex-col')
    expect(wrapper.get('[data-test="reuse-indicator"]').element.closest('aside')?.className).toContain('w-full')
  })

  it('lays main content beside the sidebar when not compact', () => {
    const wrapper = mountView()

    expect(wrapper.get('[data-test="authoring-body"]').classes()).toContain('flex-row')
  })

  it('renders an icon on every exercise-type tab', () => {
    const wrapper = mountView()

    for (const type of ['image_recognition', 'text_response', 'audio_recognition', 'image_choice']) {
      const tab = wrapper.get(`[data-test="type-tab-${type}"]`)
      expect(tab.find('svg').exists()).toBe(true)
    }
  })

  it('shows the form for a teacher', () => {
    currentUser.profile.role = 'teacher'
    const wrapper = mountView()

    expect(wrapper.find('[data-test="permission-denied"]').exists()).toBe(false)
    expect(wrapper.find('input[placeholder="Untitled exercise"]').exists()).toBe(true)
  })

  it('shows the form for an admin', () => {
    currentUser.profile.role = 'admin'
    const wrapper = mountView()

    expect(wrapper.find('[data-test="permission-denied"]').exists()).toBe(false)
  })

  it('shows a permission-denied state for a student instead of the form', () => {
    currentUser.profile.role = 'student'
    const wrapper = mountView()

    expect(wrapper.find('[data-test="permission-denied"]').exists()).toBe(true)
    expect(wrapper.find('input[placeholder="Untitled exercise"]').exists()).toBe(false)
  })

  it('does not show the AppBar Save button for a student', () => {
    currentUser.profile.role = 'student'
    const wrapper = mountView()

    expect(wrapper.find('[data-test="app-bar-save"]').exists()).toBe(false)
  })

  it('shows the reuse indicator as not-yet-linked before saving', () => {
    const wrapper = mountView()

    expect(wrapper.get('[data-test="reuse-indicator"]').text()).toContain('Not yet linked to any challenge')
  })

  it('switches editors when the exercise type tab changes', async () => {
    const wrapper = mountView()

    await wrapper.get('[data-test="type-tab-image_recognition"]').trigger('click')
    expect(wrapper.findComponent({ name: 'ImageRegionEditor' }).exists()).toBe(true)

    await wrapper.get('[data-test="type-tab-image_choice"]').trigger('click')
    expect(wrapper.findComponent({ name: 'ImageChoiceOptionsEditor' }).exists()).toBe(true)

    await wrapper.get('[data-test="type-tab-audio_recognition"]').trigger('click')
    expect(wrapper.findComponent({ name: 'TextOptionsEditor' }).exists()).toBe(true)
    expect(wrapper.get('[data-test="choose-stimulus"]').text()).toContain('audio')
  })

  it('previews a picked stimulus image locally without uploading it yet', async () => {
    const wrapper = mountView()
    await wrapper.get('[data-test="type-tab-image_recognition"]').trigger('click')

    await wrapper.get('[data-test="choose-stimulus"]').trigger('click')
    const file = new File(['data'], 'fret.png', { type: 'image/png' })
    await wrapper.findComponent(ImagePickerModal).vm.$emit('select', file)

    expect(upload).not.toHaveBeenCalled()
    expect(wrapper.findComponent({ name: 'ImageRegionEditor' }).props('imageUrl')).toBe('blob:local-preview')
  })

  it('adds and removes skill tags', async () => {
    const wrapper = mountView()

    const input = wrapper.get('input[placeholder="Type a skill and press Enter"]')
    await input.setValue('technique')
    await input.trigger('keydown.enter')

    expect(wrapper.text()).toContain('technique')
  })

  it('disables the AppBar Save button until at least one option is marked correct', async () => {
    const wrapper = mountView()
    await wrapper.get('input[placeholder="Untitled exercise"]').setValue('title')

    const saveButton = wrapper.get('[data-test="app-bar-save"]')
    expect(saveButton.attributes('disabled')).toBeDefined()
    expect(POST).not.toHaveBeenCalled()
  })

  it('creates the exercise on save with no pending media and shows a success message', async () => {
    POST.mockResolvedValueOnce({
      data: { exercise_id: 'e-1', challenge_ids: [] },
      error: undefined,
      response: { status: 201 },
    })
    const wrapper = mountView()
    await fillMinimalTextResponse(wrapper)

    await wrapper.get('[data-test="app-bar-save"]').trigger('click')
    await flushPromises()

    expect(upload).not.toHaveBeenCalled()
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

  it('uploads a pending stimulus image before saving, then sends the real URL', async () => {
    upload.mockResolvedValueOnce('https://cdn.example.com/library/fret.png')
    POST.mockResolvedValueOnce({
      data: { exercise_id: 'e-1', challenge_ids: [] },
      error: undefined,
      response: { status: 201 },
    })
    const wrapper = mountView()
    await wrapper.get('[data-test="type-tab-image_recognition"]').trigger('click')
    await wrapper.get('input[placeholder="Untitled exercise"]').setValue('Root position')
    await wrapper.get('textarea').setValue('Identify the root position')

    await wrapper.get('[data-test="choose-stimulus"]').trigger('click')
    const file = new File(['data'], 'fret.png', { type: 'image/png' })
    await wrapper.findComponent(ImagePickerModal).vm.$emit('select', file)

    await wrapper.get('[data-test="region-canvas"]').trigger('click', { clientX: 0, clientY: 0 })
    await wrapper.get('[data-test="region-toggle"]').trigger('click')

    await wrapper.get('[data-test="app-bar-save"]').trigger('click')
    await flushPromises()

    expect(upload).toHaveBeenCalledWith(file, 'image')
    expect(POST).toHaveBeenCalledWith(
      '/exercises',
      expect.objectContaining({ body: expect.objectContaining({ image_url: 'https://cdn.example.com/library/fret.png' }) }),
    )
  })

  it('shows an error and does not save when the pending upload fails', async () => {
    upload.mockRejectedValueOnce(new Error('Upload failed with status 500'))
    const wrapper = mountView()
    await wrapper.get('[data-test="type-tab-image_recognition"]').trigger('click')
    await wrapper.get('input[placeholder="Untitled exercise"]').setValue('Root position')
    await wrapper.get('textarea').setValue('Identify the root position')
    await wrapper.get('[data-test="choose-stimulus"]').trigger('click')
    await wrapper.findComponent(ImagePickerModal).vm.$emit('select', new File(['data'], 'fret.png', { type: 'image/png' }))
    await wrapper.get('[data-test="region-canvas"]').trigger('click', { clientX: 0, clientY: 0 })
    await wrapper.get('[data-test="region-toggle"]').trigger('click')

    await wrapper.get('[data-test="app-bar-save"]').trigger('click')
    await flushPromises()

    expect(POST).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="save-error"]').text()).toContain('Upload failed with status 500')
  })

  it('shows an error message when saving fails', async () => {
    POST.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 400 } })
    const wrapper = mountView()
    await fillMinimalTextResponse(wrapper)

    await wrapper.get('[data-test="app-bar-save"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="save-error"]').exists()).toBe(true)
  })

  it('shows Saved on the AppBar right after a successful save', async () => {
    POST.mockResolvedValueOnce({
      data: { exercise_id: 'e-1', challenge_ids: [] },
      error: undefined,
      response: { status: 201 },
    })
    const wrapper = mountView()
    await fillMinimalTextResponse(wrapper)

    await wrapper.get('[data-test="app-bar-save"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Saved')
  })

  it('opens the student preview modal, wired to the real ExerciseView', async () => {
    const wrapper = mountView()

    await wrapper.get('[data-test="open-preview"]').trigger('click')

    expect(wrapper.find('[data-test="preview-modal"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'ExerciseView' }).exists()).toBe(true)
  })
})
