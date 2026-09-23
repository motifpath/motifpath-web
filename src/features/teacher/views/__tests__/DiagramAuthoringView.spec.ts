import { mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import type * as VueRouter from 'vue-router'

const POST = vi.fn()
const GET = vi.fn()
const PATCH = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST, GET, PATCH }, eventApi: {} }),
}))

// Defaults to create mode (no :id param) -- the edit-mode describe block
// below sets route.params.id before mounting.
const route = reactive<{ params: { id?: string } }>({ params: {} })
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return { ...actual, useRoute: () => route }
})

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

const guitar = {
  instrument_id: 'i-1',
  name: '6-string guitar',
  family: 'fretted' as const,
  string_count: 6,
  tuning: ['E', 'A', 'D', 'G', 'B', 'E'],
}
const piano = { instrument_id: 'i-2', name: 'Piano', family: 'keyboard' as const }
const bass = {
  instrument_id: 'i-3',
  name: '4-string bass',
  family: 'fretted' as const,
  string_count: 4,
  tuning: ['E', 'A', 'D', 'G'],
}

function mountView() {
  return mount(DiagramAuthoringView, {
    global: {
      plugins: [createPinia()],
      stubs: { RouterLink: RouterLinkStub },
    },
  })
}

import FrettedDiagramEditor from '@/features/teacher/components/FrettedDiagramEditor.vue'
import SkillConceptTreePicker from '@/features/teacher/components/SkillConceptTreePicker.vue'
import DiagramAuthoringView from '@/features/teacher/views/DiagramAuthoringView.vue'
import { useToast } from '@/shared/composables/useToast'

async function selectClassification(wrapper: ReturnType<typeof mountView>) {
  const [skillPicker, conceptPicker] = wrapper.findAllComponents(SkillConceptTreePicker)
  await skillPicker!.vm.$emit('update:selected-ids', ['s-1'])
  await conceptPicker!.vm.$emit('update:selected-ids', ['c-1'])
}

describe('DiagramAuthoringView', () => {
  beforeEach(() => {
    POST.mockReset()
    GET.mockReset()
    PATCH.mockReset()
    currentUser.profile.role = 'teacher'
    route.params = {}
    mockMatchMedia(false)
    useToast().clear()
    // Instruments + skill/concept list fetches all land on the same mocked
    // GET -- default every call to an empty list, individual tests layer a
    // mockResolvedValueOnce ahead of this for the one they care about.
    GET.mockResolvedValue({ data: [], error: undefined, response: { status: 200 } })
  })

  it('shows a permission-denied state for a student instead of the form', () => {
    currentUser.profile.role = 'student'
    const wrapper = mountView()

    expect(wrapper.find('[data-test="permission-denied"]').exists()).toBe(true)
  })

  it('renders the AppBar in teacher context with a New diagram breadcrumb', () => {
    const wrapper = mountView()

    expect(wrapper.findComponent({ name: 'AppBar' }).props('context')).toBe('teacher')
    expect(wrapper.text()).toContain('New diagram')
  })

  it('only lists fretted instruments in the instrument picker', async () => {
    GET.mockResolvedValueOnce({ data: [guitar, piano], error: undefined, response: { status: 200 } })
    const wrapper = mountView()
    await new Promise((r) => setTimeout(r, 0))

    const options = wrapper.findAll('[data-test="instrument-option"]')
    expect(options).toHaveLength(1)
    expect(options[0]!.text()).toContain('6-string guitar')
  })

  it('locks the instrument picker once a position has been placed, even in create mode', async () => {
    GET.mockResolvedValueOnce({ data: [guitar, bass], error: undefined, response: { status: 200 } })
    const wrapper = mountView()
    await new Promise((r) => setTimeout(r, 0))

    const options = wrapper.findAll('[data-test="instrument-option"]')
    await options[0]!.trigger('click')
    expect(options[0]!.attributes('disabled')).toBeUndefined()

    await wrapper.findComponent(FrettedDiagramEditor).vm.$emit('toggle-cell', { string: 1, fret: 3 })

    expect(options[0]!.attributes('disabled')).toBeDefined()
    expect(options[1]!.attributes('disabled')).toBeDefined()
  })

  it('disables save until name, a position, and classification are all set', async () => {
    GET.mockResolvedValueOnce({ data: [guitar], error: undefined, response: { status: 200 } })
    const wrapper = mountView()
    await new Promise((r) => setTimeout(r, 0))

    expect(wrapper.findComponent({ name: 'AppBar' }).props('saveDisabled')).toBe(true)

    await wrapper.get('[data-test="instrument-option"]').trigger('click')
    await wrapper.get('input[data-test="diagram-name"]').setValue('Minor Pentatonic — Position 1')
    await wrapper.findComponent(FrettedDiagramEditor).vm.$emit('toggle-cell', { string: 1, fret: 3 })
    expect(wrapper.findComponent({ name: 'AppBar' }).props('saveDisabled')).toBe(true)

    await selectClassification(wrapper)
    // Still disabled: the placed position has no interval/note name yet — nothing computes
    // them until a root note is chosen, and the server rejects an incomplete position outright.
    expect(wrapper.findComponent({ name: 'AppBar' }).props('saveDisabled')).toBe(true)

    await wrapper.get('[data-test="root-note-select"]').setValue('G')
    expect(wrapper.findComponent({ name: 'AppBar' }).props('saveDisabled')).toBe(false)
  })

  it('creates a diagram once, from the positions placed on the editor', async () => {
    GET.mockResolvedValueOnce({ data: [guitar], error: undefined, response: { status: 200 } })
    POST.mockResolvedValueOnce({
      data: {
        diagram_id: 'd-new',
        instrument_id: 'i-1',
        name: 'Minor Pentatonic — Position 1',
        positions: [{ position_id: 'p-1', interval: 'R', note_name: 'G', string: 1, fret: 3, sequence_index: null }],
        classification: { skills: [], concepts: [] },
        created_at: '2026-09-22T00:00:00Z',
      },
      error: undefined,
      response: { status: 201 },
    })
    const wrapper = mountView()
    await new Promise((r) => setTimeout(r, 0))

    await wrapper.get('[data-test="instrument-option"]').trigger('click')
    await wrapper.get('input[data-test="diagram-name"]').setValue('Minor Pentatonic — Position 1')
    await wrapper.findComponent(FrettedDiagramEditor).vm.$emit('toggle-cell', { string: 1, fret: 3 })
    await selectClassification(wrapper)
    // String 1 is the high E string; fret 3 sounds G — picking G as root makes it the R.
    await wrapper.get('[data-test="root-note-select"]').setValue('G')

    await wrapper.findComponent({ name: 'AppBar' }).props('onSave')!()

    expect(POST).toHaveBeenCalledWith(
      '/diagrams',
      expect.objectContaining({
        body: expect.objectContaining({
          instrument_id: 'i-1',
          name: 'Minor Pentatonic — Position 1',
          positions: [expect.objectContaining({ interval: 'R', note_name: 'G', string: 1, fret: 3 })],
        }),
      }),
    )
  })

  it('opens the full-size preview modal from the "view full preview" button', async () => {
    GET.mockResolvedValueOnce({ data: [guitar], error: undefined, response: { status: 200 } })
    const wrapper = mountView()
    await new Promise((r) => setTimeout(r, 0))

    await wrapper.get('[data-test="instrument-option"]').trigger('click')
    await wrapper.findComponent(FrettedDiagramEditor).vm.$emit('toggle-cell', { string: 1, fret: 3 })

    expect(wrapper.find('[data-test="modal-overlay"]').exists()).toBe(false)

    await wrapper.get('[data-test="open-preview-modal"]').trigger('click')

    expect(wrapper.find('[data-test="modal-overlay"]').exists()).toBe(true)
  })

  describe('in edit mode', () => {
    beforeEach(() => {
      route.params = { id: 'd-1' }
    })

    it('loads the diagram, locks the instrument picker, and patches on save', async () => {
      GET.mockResolvedValueOnce({
        data: {
          diagram_id: 'd-1',
          instrument_id: 'i-1',
          name: 'C Major Scale',
          positions: [{ position_id: 'p-1', interval: 'R', note_name: 'C', string: 2, fret: 1, sequence_index: null }],
          classification: {
            skills: [{ skill_id: 's-1', name: 'Scales', parent_id: null }],
            concepts: [{ concept_id: 'c-1', name: 'Major', parent_id: null }],
          },
          created_at: '2026-09-22T00:00:00Z',
        },
        error: undefined,
        response: { status: 200 },
      })
      GET.mockResolvedValueOnce({ data: [guitar], error: undefined, response: { status: 200 } })
      PATCH.mockResolvedValueOnce({
        data: {
          diagram_id: 'd-1',
          instrument_id: 'i-1',
          name: 'C Major Scale (updated)',
          positions: [{ position_id: 'p-1', interval: 'R', note_name: 'C', string: 2, fret: 1, sequence_index: null }],
          classification: {
            skills: [{ skill_id: 's-1', name: 'Scales', parent_id: null }],
            concepts: [{ concept_id: 'c-1', name: 'Major', parent_id: null }],
          },
          created_at: '2026-09-22T00:00:00Z',
        },
        error: undefined,
        response: { status: 200 },
      })

      const wrapper = mountView()
      await new Promise((r) => setTimeout(r, 0))

      expect(wrapper.get<HTMLInputElement>('input[data-test="diagram-name"]').element.value).toBe('C Major Scale')
      expect(wrapper.find('[data-test="instrument-option"]').attributes('disabled')).toBeDefined()

      await wrapper.get('input[data-test="diagram-name"]').setValue('C Major Scale (updated)')
      await wrapper.findComponent({ name: 'AppBar' }).props('onSave')!()

      expect(PATCH).toHaveBeenCalledWith(
        '/diagrams/{diagram_id}',
        expect.objectContaining({
          params: { path: { diagram_id: 'd-1' } },
          body: expect.objectContaining({ name: 'C Major Scale (updated)' }),
        }),
      )
    })

    it('restores the saved root note, label display, and each position\'s shape when reopened for editing', async () => {
      GET.mockResolvedValueOnce({
        data: {
          diagram_id: 'd-1',
          instrument_id: 'i-1',
          name: 'C Major Scale',
          root_note: 'C',
          label_display: 'note',
          positions: [{ position_id: 'p-1', interval: 'R', note_name: 'C', shape: 'star', string: 2, fret: 1, sequence_index: null }],
          classification: {
            skills: [{ skill_id: 's-1', name: 'Scales', parent_id: null }],
            concepts: [{ concept_id: 'c-1', name: 'Major', parent_id: null }],
          },
          created_at: '2026-09-22T00:00:00Z',
        },
        error: undefined,
        response: { status: 200 },
      })
      GET.mockResolvedValueOnce({ data: [guitar], error: undefined, response: { status: 200 } })

      const wrapper = mountView()
      await new Promise((r) => setTimeout(r, 0))

      expect(wrapper.get<HTMLSelectElement>('select[data-test="root-note-select"]').element.value).toBe('C')
      expect(wrapper.get('[data-test="label-mode-note"]').classes()).toContain('bg-accent')
      const shapeOptions = wrapper.findComponent(FrettedDiagramEditor).findAll('[data-test="position-shape-option"]')
      expect(shapeOptions[2]?.attributes('aria-pressed')).toBe('true') // star is the third option
    })
  })
})
