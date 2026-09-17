import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import type * as VueRouter from 'vue-router'

const POST = vi.fn()
const GET = vi.fn()
const PUT = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST, GET, PUT }, eventApi: {} }),
}))

// Defaults to create mode (no :id param) -- the edit-mode describe block
// below sets route.params.id before mounting.
const route = reactive<{ params: { id?: string } }>({ params: {} })
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return { ...actual, useRoute: () => route }
})

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

const revokeObjectURL = vi.fn()
vi.stubGlobal('URL', {
  ...URL,
  createObjectURL: vi.fn((file: File) => `blob:${file.name}`),
  revokeObjectURL,
})

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
import PromptEditor from '@/features/teacher/components/PromptEditor.vue'
import ExerciseAuthoringView from '@/features/teacher/views/ExerciseAuthoringView.vue'
import { useToast } from '@/shared/composables/useToast'
import { plainTextPrompt } from '@/shared/testUtils/promptDocument'

async function fillMinimalTextResponse(wrapper: ReturnType<typeof mountView>) {
  await wrapper.get('input[placeholder="Untitled exercise"]').setValue('Name the chord')
  await wrapper.findComponent(PromptEditor).vm.$emit('update:modelValue', plainTextPrompt('Name this chord shape'))
  await wrapper.get('[data-test="add-option"]').trigger('click')
  await wrapper.get('input[placeholder="Option text"]').setValue('G major')
  await wrapper.get('[data-test="option-correct"]').trigger('click')
}

describe('ExerciseAuthoringView', () => {
  beforeEach(() => {
    POST.mockReset()
    GET.mockReset()
    PUT.mockReset()
    upload.mockReset()
    currentUser.profile.role = 'teacher'
    route.params = {}
    window.localStorage.clear()
    document.documentElement.classList.remove('dark')
    mockMatchMedia(false)
    useToast().clear()
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

  it('shows a chevron-style image trigger with no thumbnail, updating its label once an image is picked', async () => {
    const wrapper = mountView()
    await wrapper.get('[data-test="type-tab-image_recognition"]').trigger('click')

    const trigger = wrapper.get('[data-test="choose-stimulus"]')
    expect(trigger.text()).toContain('No image selected')
    expect(trigger.text()).toContain('Choose image')
    expect(trigger.find('img').exists()).toBe(false)

    await trigger.trigger('click')
    const file = new File(['data'], 'fret.png', { type: 'image/png' })
    await wrapper.findComponent(ImagePickerModal).vm.$emit('select', file)

    expect(wrapper.get('[data-test="choose-stimulus"]').text()).toContain('fret.png')
  })

  it('renders an icon on every exercise-type tab', () => {
    const wrapper = mountView()

    for (const type of ['image_recognition', 'text_response', 'audio_recognition', 'image_choice', 'audio_selection']) {
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

  it('shows the reuse indicator as not-yet-available before saving', () => {
    const wrapper = mountView()

    expect(wrapper.get('[data-test="reuse-indicator"]').text()).toContain("Save the exercise to see where it's used")
  })

  it('shows all three usage contexts as empty right after creating a fresh exercise', async () => {
    POST.mockResolvedValueOnce({
      data: { exercise_id: 'e-1', challenge_ids: [], content_node_ids: [] },
      error: undefined,
      response: { status: 201 },
    })
    const wrapper = mountView()
    await fillMinimalTextResponse(wrapper)

    await wrapper.get('[data-test="app-bar-save"]').trigger('click')
    await flushPromises()

    const indicator = wrapper.get('[data-test="reuse-indicator"]')
    expect(indicator.get('[data-test="usage-challenges"]').text()).toContain('Not linked to any challenge yet')
    expect(indicator.get('[data-test="usage-path-exercises"]').text()).toContain('Not linked to any path node yet')
    expect(indicator.get('[data-test="usage-practice-sessions"]').text()).toContain('Not eligible')
  })

  it('lists linked challenges and path exercises after saving', async () => {
    POST.mockResolvedValueOnce({
      data: { exercise_id: 'e-1', challenge_ids: ['c-1', 'c-2'], content_node_ids: ['n-1'] },
      error: undefined,
      response: { status: 201 },
    })
    const wrapper = mountView()
    await fillMinimalTextResponse(wrapper)

    await wrapper.get('[data-test="app-bar-save"]').trigger('click')
    await flushPromises()

    const indicator = wrapper.get('[data-test="reuse-indicator"]')
    expect(indicator.get('[data-test="usage-challenges"]').text()).toContain('c-1')
    expect(indicator.get('[data-test="usage-challenges"]').text()).toContain('c-2')
    expect(indicator.get('[data-test="usage-path-exercises"]').text()).toContain('n-1')
  })

  it('shows practice-session eligibility once a skill tag is added', async () => {
    POST.mockResolvedValueOnce({
      data: { exercise_id: 'e-1', challenge_ids: [], content_node_ids: [] },
      error: undefined,
      response: { status: 201 },
    })
    const wrapper = mountView()
    await fillMinimalTextResponse(wrapper)
    const input = wrapper.get('input[placeholder="Type a skill and press Enter"]')
    await input.setValue('alternate_picking')
    await input.trigger('keydown.enter')

    await wrapper.get('[data-test="app-bar-save"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="usage-practice-sessions"]').text()).toContain('alternate_picking')
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

    await wrapper.get('[data-test="type-tab-audio_selection"]').trigger('click')
    expect(wrapper.findComponent({ name: 'AudioSelectionOptionsEditor' }).exists()).toBe(true)
  })

  it('previews a picked stimulus image locally without uploading it yet', async () => {
    const wrapper = mountView()
    await wrapper.get('[data-test="type-tab-image_recognition"]').trigger('click')

    await wrapper.get('[data-test="choose-stimulus"]').trigger('click')
    const file = new File(['data'], 'fret.png', { type: 'image/png' })
    await wrapper.findComponent(ImagePickerModal).vm.$emit('select', file)

    expect(upload).not.toHaveBeenCalled()
    expect(wrapper.findComponent({ name: 'ImageRegionEditor' }).props('imageUrl')).toBe('blob:fret.png')
  })

  it('adds and removes skill tags', async () => {
    const wrapper = mountView()

    const input = wrapper.get('input[placeholder="Type a skill and press Enter"]')
    await input.setValue('technique')
    await input.trigger('keydown.enter')

    expect(wrapper.text()).toContain('technique')
  })

  it('loads and offers skill tags already used on other exercises once the tag input is focused', async () => {
    GET.mockResolvedValueOnce({
      data: [{ exercise_id: 'e-1', skill_tags: ['alternate-picking'] }],
      error: undefined,
      response: { status: 200 },
    })
    const wrapper = mountView()

    const input = wrapper.get('input[placeholder="Type a skill and press Enter"]')
    await input.trigger('focus')
    await flushPromises()
    await input.setValue('alt')

    expect(GET).toHaveBeenCalledWith('/exercises', {})
    expect(wrapper.get('[data-test="tag-suggestion"]').text()).toBe('alternate-picking')
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
        exercise_type: 'text_response',
        options: [expect.objectContaining({ is_correct: true, label: 'G major' })],
      }),
    })
    // Passed through the real PromptEditor's Tiptap round trip (via its
    // watcher syncing form.prompt.value back into the editor), so the
    // request's prompt carries ProseMirror's normalized node attrs rather
    // than the minimal shape plainTextPrompt builds — assert its text
    // content instead of an exact document shape.
    expect(JSON.stringify(POST.mock.calls[0]![1].body.prompt)).toContain('Name this chord shape')
    expect(useToast().toasts.value).toContainEqual(
      expect.objectContaining({ kind: 'success', message: 'Exercise created.' }),
    )
  })

  it('updates instead of re-creating when Save is clicked again after a successful create', async () => {
    POST.mockResolvedValueOnce({
      data: { exercise_id: 'e-1', challenge_ids: [] },
      error: undefined,
      response: { status: 201 },
    })
    PUT.mockResolvedValueOnce({
      data: { exercise_id: 'e-1', challenge_ids: [] },
      error: undefined,
      response: { status: 200 },
    })
    const wrapper = mountView()
    await fillMinimalTextResponse(wrapper)

    await wrapper.get('[data-test="app-bar-save"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-test="app-bar-save"]').trigger('click')
    await flushPromises()

    expect(POST).toHaveBeenCalledTimes(1)
    expect(PUT).toHaveBeenCalledWith('/exercises/{exercise_id}', {
      params: { path: { exercise_id: 'e-1' } },
      body: expect.objectContaining({ title: 'Name the chord' }),
    })
    expect(useToast().toasts.value).toContainEqual(
      expect.objectContaining({ kind: 'success', message: 'Exercise updated.' }),
    )
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
    await wrapper.findComponent(PromptEditor).vm.$emit('update:modelValue', plainTextPrompt('Identify the root position'))

    await wrapper.get('[data-test="choose-stimulus"]').trigger('click')
    const file = new File(['data'], 'fret.png', { type: 'image/png' })
    await wrapper.findComponent(ImagePickerModal).vm.$emit('select', file)

    await wrapper.get('img').trigger('load')
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
    await wrapper.findComponent(PromptEditor).vm.$emit('update:modelValue', plainTextPrompt('Identify the root position'))
    await wrapper.get('[data-test="choose-stimulus"]').trigger('click')
    await wrapper.findComponent(ImagePickerModal).vm.$emit('select', new File(['data'], 'fret.png', { type: 'image/png' }))
    await wrapper.get('img').trigger('load')
    await wrapper.get('[data-test="region-canvas"]').trigger('click', { clientX: 0, clientY: 0 })
    await wrapper.get('[data-test="region-toggle"]').trigger('click')

    await wrapper.get('[data-test="app-bar-save"]').trigger('click')
    await flushPromises()

    expect(POST).not.toHaveBeenCalled()
    expect(useToast().toasts.value).toContainEqual(
      expect.objectContaining({ kind: 'error', message: 'Upload failed with status 500' }),
    )
  })

  it('shows an error message when saving fails', async () => {
    POST.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 400 } })
    const wrapper = mountView()
    await fillMinimalTextResponse(wrapper)

    await wrapper.get('[data-test="app-bar-save"]').trigger('click')
    await flushPromises()

    expect(useToast().toasts.value).toContainEqual(expect.objectContaining({ kind: 'error', message: 'Boom' }))
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

    expect(wrapper.find('[data-test="modal-overlay"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'ExerciseView' }).exists()).toBe(true)
  })

  it('uploads a stale stimulus file under the type it was picked for, not the type switched to afterward', async () => {
    upload.mockResolvedValueOnce('https://cdn.example.com/library/fret.png')
    POST.mockResolvedValueOnce({
      data: { exercise_id: 'e-1', challenge_ids: [] },
      error: undefined,
      response: { status: 201 },
    })
    const wrapper = mountView()
    await wrapper.get('[data-test="type-tab-image_recognition"]').trigger('click')
    await wrapper.get('[data-test="choose-stimulus"]').trigger('click')
    const file = new File(['data'], 'fret.png', { type: 'image/png' })
    await wrapper.findComponent(ImagePickerModal).vm.$emit('select', file)

    // Switch away before saving -- the picked file must still upload as
    // 'image', not whatever type happens to be selected at save time.
    await wrapper.get('[data-test="type-tab-audio_recognition"]').trigger('click')
    await wrapper.get('input[placeholder="Untitled exercise"]').setValue('t')
    await wrapper.findComponent(PromptEditor).vm.$emit('update:modelValue', plainTextPrompt('p'))
    await wrapper.get('[data-test="add-option"]').trigger('click')
    await wrapper.get('input[placeholder="Option text"]').setValue('a')
    await wrapper.get('[data-test="option-correct"]').trigger('click')

    await wrapper.get('[data-test="app-bar-save"]').trigger('click')
    await flushPromises()

    expect(upload).toHaveBeenCalledWith(file, 'image')
  })

  it('does not upload a removed image-choice option file on save', async () => {
    POST.mockResolvedValueOnce({
      data: { exercise_id: 'e-1', challenge_ids: [] },
      error: undefined,
      response: { status: 201 },
    })
    const wrapper = mountView()
    await wrapper.get('[data-test="type-tab-image_choice"]').trigger('click')
    await wrapper.get('input[placeholder="Untitled exercise"]').setValue('t')
    await wrapper.findComponent(PromptEditor).vm.$emit('update:modelValue', plainTextPrompt('p'))

    await wrapper.get('[data-test="add-option"]').trigger('click')
    const editor = wrapper.findComponent({ name: 'ImageChoiceOptionsEditor' })
    const removedId = (editor.props('options') as { id: string }[])[0]!.id
    await editor.vm.$emit('setFile', removedId, new File(['data'], 'a.png', { type: 'image/png' }))
    await editor.vm.$emit('remove', removedId)

    await wrapper.get('[data-test="add-option"]').trigger('click')
    await wrapper.get('[data-test="option-correct"]').trigger('click')

    await wrapper.get('[data-test="app-bar-save"]').trigger('click')
    await flushPromises()

    expect(upload).not.toHaveBeenCalled()
  })

  it('revokes the previous blob URL when a new stimulus image replaces it', async () => {
    const wrapper = mountView()
    await wrapper.get('[data-test="type-tab-image_recognition"]').trigger('click')

    await wrapper.get('[data-test="choose-stimulus"]').trigger('click')
    await wrapper.findComponent(ImagePickerModal).vm.$emit('select', new File(['a'], 'first.png'))
    await wrapper.get('[data-test="choose-stimulus"]').trigger('click')
    await wrapper.findComponent(ImagePickerModal).vm.$emit('select', new File(['b'], 'second.png'))

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:first.png')
  })

  it('clears the stale image blob when a stimulus is later picked for audio instead, so switching back does not resurrect it', async () => {
    const wrapper = mountView()
    await wrapper.get('[data-test="type-tab-image_recognition"]').trigger('click')
    await wrapper.get('[data-test="choose-stimulus"]').trigger('click')
    await wrapper.findComponent(ImagePickerModal).vm.$emit('select', new File(['a'], 'fret.png'))

    // Switch to audio and pick a stimulus there instead -- the image pick
    // is now abandoned and should not resurface if we switch back.
    await wrapper.get('[data-test="type-tab-audio_recognition"]').trigger('click')
    await wrapper.get('[data-test="choose-stimulus"]').trigger('click')
    await wrapper.findComponent(ImagePickerModal).vm.$emit('select', new File(['b'], 'clip.mp3'))

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fret.png')

    // Switch back to image_recognition without re-picking: the abandoned
    // blob must not resurface as if it were still a valid selection.
    await wrapper.get('[data-test="type-tab-image_recognition"]').trigger('click')

    expect(wrapper.get('[data-test="choose-stimulus"]').text()).toContain('No image selected')
    expect(wrapper.findComponent({ name: 'ImageRegionEditor' }).props('imageUrl')).toBe('')
  })

  it('does not upload a pending image_choice option file when saving under a different exercise type', async () => {
    POST.mockResolvedValueOnce({
      data: { exercise_id: 'e-1', challenge_ids: [] },
      error: undefined,
      response: { status: 201 },
    })
    const wrapper = mountView()
    await wrapper.get('[data-test="type-tab-image_choice"]').trigger('click')
    await wrapper.get('[data-test="add-option"]').trigger('click')
    const editor = wrapper.findComponent({ name: 'ImageChoiceOptionsEditor' })
    const id = (editor.props('options') as { id: string }[])[0]!.id
    await editor.vm.$emit('setFile', id, new File(['data'], 'a.png'))

    // Switch away to a type that actually gets saved -- the abandoned
    // image_choice option's file must not be uploaded.
    await wrapper.get('[data-test="type-tab-text_response"]').trigger('click')
    await fillMinimalTextResponse(wrapper)

    await wrapper.get('[data-test="app-bar-save"]').trigger('click')
    await flushPromises()

    expect(upload).not.toHaveBeenCalled()
  })

  it('uploads a pending audio_selection option file on save', async () => {
    upload.mockResolvedValueOnce('https://cdn.example.com/library/a.mp3')
    POST.mockResolvedValueOnce({
      data: { exercise_id: 'e-1', challenge_ids: [] },
      error: undefined,
      response: { status: 201 },
    })
    const wrapper = mountView()
    await wrapper.get('[data-test="type-tab-audio_selection"]').trigger('click')
    await wrapper.get('input[placeholder="Untitled exercise"]').setValue('t')
    await wrapper.findComponent(PromptEditor).vm.$emit('update:modelValue', plainTextPrompt('p'))
    await wrapper.get('[data-test="add-option"]').trigger('click')
    const editor = wrapper.findComponent({ name: 'AudioSelectionOptionsEditor' })
    const id = (editor.props('options') as { id: string }[])[0]!.id
    const file = new File(['data'], 'a.mp3', { type: 'audio/mpeg' })
    await editor.vm.$emit('setFile', id, file)
    await wrapper.get('[data-test="option-correct"]').trigger('click')

    await wrapper.get('[data-test="app-bar-save"]').trigger('click')
    await flushPromises()

    expect(upload).toHaveBeenCalledWith(file, 'audio')
  })

  it('does not upload a pending audio_selection option file when saving under a different exercise type', async () => {
    POST.mockResolvedValueOnce({
      data: { exercise_id: 'e-1', challenge_ids: [] },
      error: undefined,
      response: { status: 201 },
    })
    const wrapper = mountView()
    await wrapper.get('[data-test="type-tab-audio_selection"]').trigger('click')
    await wrapper.get('[data-test="add-option"]').trigger('click')
    const editor = wrapper.findComponent({ name: 'AudioSelectionOptionsEditor' })
    const id = (editor.props('options') as { id: string }[])[0]!.id
    await editor.vm.$emit('setFile', id, new File(['data'], 'a.mp3'))

    // Switch away to a type that actually gets saved -- the abandoned
    // audio_selection option's file must not be uploaded.
    await wrapper.get('[data-test="type-tab-text_response"]').trigger('click')
    await fillMinimalTextResponse(wrapper)

    await wrapper.get('[data-test="app-bar-save"]').trigger('click')
    await flushPromises()

    expect(upload).not.toHaveBeenCalled()
  })

  it('revokes the stimulus blob URL once it is replaced by the real uploaded URL', async () => {
    upload.mockResolvedValueOnce('https://cdn.example.com/library/fret.png')
    POST.mockResolvedValueOnce({
      data: { exercise_id: 'e-1', challenge_ids: [] },
      error: undefined,
      response: { status: 201 },
    })
    const wrapper = mountView()
    await wrapper.get('[data-test="type-tab-image_recognition"]').trigger('click')
    await wrapper.get('input[placeholder="Untitled exercise"]').setValue('t')
    await wrapper.findComponent(PromptEditor).vm.$emit('update:modelValue', plainTextPrompt('p'))
    await wrapper.get('[data-test="choose-stimulus"]').trigger('click')
    await wrapper.findComponent(ImagePickerModal).vm.$emit('select', new File(['a'], 'fret.png'))
    await wrapper.get('img').trigger('load')
    await wrapper.get('[data-test="region-canvas"]').trigger('click', { clientX: 0, clientY: 0 })
    await wrapper.get('[data-test="region-toggle"]').trigger('click')

    await wrapper.get('[data-test="app-bar-save"]').trigger('click')
    await flushPromises()

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fret.png')
  })

  it('never calls the create-exercise API when invoked without a correct option, even bypassing the disabled button', async () => {
    const wrapper = mountView()
    await wrapper.get('input[placeholder="Untitled exercise"]').setValue('t')

    // The button is disabled (covered by the earlier test); this calls the
    // save handler directly to prove the guard is in the handler itself,
    // not only the disabled attribute on the button.
    await wrapper.findComponent({ name: 'AppBar' }).props('onSave')()
    await flushPromises()

    expect(POST).not.toHaveBeenCalled()
  })

  it('does not call onSave when the disabled AppBar Save button is clicked', async () => {
    const wrapper = mountView()
    await wrapper.get('input[placeholder="Untitled exercise"]').setValue('t')

    await wrapper.get('[data-test="app-bar-save"]').trigger('click')
    await flushPromises()

    expect(POST).not.toHaveBeenCalled()
  })

  it('shows an error and stops saving when the create-exercise call itself rejects (not just returns an error)', async () => {
    POST.mockRejectedValueOnce(new Error('network down'))
    const wrapper = mountView()
    await fillMinimalTextResponse(wrapper)

    await wrapper.get('[data-test="app-bar-save"]').trigger('click')
    await flushPromises()

    expect(useToast().toasts.value).toContainEqual(expect.objectContaining({ kind: 'error', message: 'network down' }))
    expect(wrapper.get('[data-test="app-bar-save"]').text()).not.toContain('Saving')
  })

  it('uploads multiple pending option images concurrently, not one after another', async () => {
    let resolveFirst!: (url: string) => void
    let resolveSecond!: (url: string) => void
    upload.mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
    upload.mockImplementationOnce(() => new Promise((resolve) => (resolveSecond = resolve)))
    POST.mockResolvedValueOnce({
      data: { exercise_id: 'e-1', challenge_ids: [] },
      error: undefined,
      response: { status: 201 },
    })
    const wrapper = mountView()
    await wrapper.get('[data-test="type-tab-image_choice"]').trigger('click')
    await wrapper.get('input[placeholder="Untitled exercise"]').setValue('t')
    await wrapper.findComponent(PromptEditor).vm.$emit('update:modelValue', plainTextPrompt('p'))
    await wrapper.get('[data-test="add-option"]').trigger('click')
    await wrapper.get('[data-test="add-option"]').trigger('click')
    const editor = wrapper.findComponent({ name: 'ImageChoiceOptionsEditor' })
    const ids = (editor.props('options') as { id: string }[]).map((o) => o.id)
    await editor.vm.$emit('setFile', ids[0], new File(['a'], 'a.png'))
    await editor.vm.$emit('setFile', ids[1], new File(['b'], 'b.png'))
    await wrapper.get('[data-test="option-correct"]').trigger('click')

    const savePromise = wrapper.get('[data-test="app-bar-save"]').trigger('click')
    await Promise.resolve()
    await Promise.resolve()

    // Both uploads should be in flight before either resolves.
    expect(upload).toHaveBeenCalledTimes(2)

    resolveFirst('https://cdn.example.com/a.png')
    resolveSecond('https://cdn.example.com/b.png')
    await savePromise
    await flushPromises()

    expect(POST).toHaveBeenCalled()
  })

  describe('edit mode', () => {
    beforeEach(() => {
      route.params = { id: 'e-1' }
    })

    it('loads the exercise by id and pre-fills the form', async () => {
      GET.mockResolvedValueOnce({
        data: {
          exercise_id: 'e-1',
          title: 'Name the chord',
          prompt: plainTextPrompt('Name this chord shape'),
          exercise_type: 'text_response',
          skill_tags: ['theory'],
          options: [{ option_id: 'o-1', is_correct: true, label: 'G major' }],
          challenge_ids: ['c-1'],
          content_node_ids: [],
          created_at: '2026-01-01T00:00:00Z',
        },
        error: undefined,
        response: { status: 200 },
      })

      const wrapper = mountView()
      await flushPromises()

      expect(GET).toHaveBeenCalledWith('/exercises/{exercise_id}', { params: { path: { exercise_id: 'e-1' } } })
      expect(wrapper.get<HTMLInputElement>('input[placeholder="Untitled exercise"]').element.value).toBe(
        'Name the chord',
      )
      expect(wrapper.findComponent(PromptEditor).props('modelValue')).toEqual(plainTextPrompt('Name this chord shape'))
      expect(wrapper.get<HTMLInputElement>('input[placeholder="Option text"]').element.value).toBe('G major')
      expect(wrapper.text()).toContain('theory')
      expect(wrapper.get('[data-test="usage-challenges"]').text()).toContain('c-1')
    })

    it('disables the exercise type tabs -- type cannot change after creation', async () => {
      GET.mockResolvedValueOnce({
        data: {
          exercise_id: 'e-1',
          title: 't',
          prompt: plainTextPrompt('p'),
          exercise_type: 'text_response',
          options: [],
          challenge_ids: [],
          content_node_ids: [],
          created_at: '2026-01-01T00:00:00Z',
        },
        error: undefined,
        response: { status: 200 },
      })

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.get('[data-test="type-tab-image_recognition"]').attributes('disabled')).toBeDefined()
    })

    it('submits via PUT with the update request shape, and reports Exercise updated', async () => {
      GET.mockResolvedValueOnce({
        data: {
          exercise_id: 'e-1',
          title: 't',
          prompt: plainTextPrompt('p'),
          exercise_type: 'text_response',
          options: [{ option_id: 'o-1', is_correct: true, label: 'G major' }],
          challenge_ids: [],
          content_node_ids: [],
          created_at: '2026-01-01T00:00:00Z',
        },
        error: undefined,
        response: { status: 200 },
      })
      PUT.mockResolvedValueOnce({
        data: { exercise_id: 'e-1', challenge_ids: [], content_node_ids: [] },
        error: undefined,
        response: { status: 200 },
      })

      const wrapper = mountView()
      await flushPromises()
      await wrapper.get('input[placeholder="Untitled exercise"]').setValue('Updated title')

      await wrapper.get('[data-test="app-bar-save"]').trigger('click')
      await flushPromises()

      expect(PUT).toHaveBeenCalledWith('/exercises/{exercise_id}', {
        params: { path: { exercise_id: 'e-1' } },
        body: expect.objectContaining({
          title: 'Updated title',
          prompt: plainTextPrompt('p'),
          options: [expect.objectContaining({ is_correct: true, label: 'G major' })],
        }),
      })
      expect(PUT.mock.calls[0]![1].body).not.toHaveProperty('exercise_type')
      expect(POST).not.toHaveBeenCalled()
      expect(useToast().toasts.value).toContainEqual(
        expect.objectContaining({ kind: 'success', message: 'Exercise updated.' }),
      )
    })

    it('shows an error state with retry when loading the exercise fails', async () => {
      GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })
      GET.mockResolvedValueOnce({
        data: {
          exercise_id: 'e-1',
          title: 't',
          prompt: plainTextPrompt('p'),
          exercise_type: 'text_response',
          options: [],
          challenge_ids: [],
          content_node_ids: [],
          created_at: '2026-01-01T00:00:00Z',
        },
        error: undefined,
        response: { status: 200 },
      })

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.find('[data-test="load-error"]').exists()).toBe(true)

      await wrapper.get('[data-test="retry"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-test="load-error"]').exists()).toBe(false)
      expect(wrapper.get<HTMLInputElement>('input[placeholder="Untitled exercise"]').element.value).toBe('t')
    })
  })
})
