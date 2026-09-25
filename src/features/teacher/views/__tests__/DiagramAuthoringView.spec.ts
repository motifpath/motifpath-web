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
const router = { replace: vi.fn() }
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return { ...actual, useRoute: () => route, useRouter: () => router }
})

const currentUser = reactive({
  profile: { user_id: 'u-teacher', role: 'teacher' as 'student' | 'teacher' | 'admin' },
})
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

import { COLOR_PALETTE } from '@/shared/utils/colorPalette'
import FrettedDiagramEditor from '@/features/teacher/components/FrettedDiagramEditor.vue'
import SkillConceptTreePicker from '@/features/teacher/components/SkillConceptTreePicker.vue'
import DiagramAuthoringView from '@/features/teacher/views/DiagramAuthoringView.vue'
import type { components } from '@/api/generated/core-domain'
import { useToast } from '@/shared/composables/useToast'

type Diagram = components['schemas']['Diagram']

async function selectClassification(wrapper: ReturnType<typeof mountView>) {
  const [skillPicker, conceptPicker] = wrapper.findAllComponents(SkillConceptTreePicker)
  await skillPicker!.vm.$emit('update:selected-ids', ['s-1'])
  await conceptPicker!.vm.$emit('update:selected-ids', ['c-1'])
}

/** Opens the general marker color palette (from its toolbar icon button) if it is not already open. */
async function openColorMenu(wrapper: ReturnType<typeof mountView>) {
  if (!wrapper.find('[data-test="color-palette"]').exists()) {
    await wrapper.get('[data-test="diagram-color-trigger"]').trigger('click')
  }
}

describe('DiagramAuthoringView', () => {
  beforeEach(() => {
    POST.mockReset()
    GET.mockReset()
    PATCH.mockReset()
    currentUser.profile.role = 'teacher'
    currentUser.profile.user_id = 'u-teacher'
    route.params = {}
    router.replace.mockReset()
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

  it("saves the general color chosen from the palette and a position's own color", async () => {
    GET.mockResolvedValueOnce({ data: [guitar], error: undefined, response: { status: 200 } })
    POST.mockResolvedValueOnce({
      data: {
        diagram_id: 'd-new',
        instrument_id: 'i-1',
        name: 'Colored',
        root_note: null,
        label_display: 'interval',
        color: '#3B82F6',
        positions: [],
        classification: { skills: [], concepts: [] },
        created_at: '2026-09-23T00:00:00Z',
      },
      error: undefined,
      response: { status: 201 },
    })
    const wrapper = mountView()
    await new Promise((r) => setTimeout(r, 0))

    await wrapper.get('[data-test="instrument-option"]').trigger('click')
    await wrapper.get('input[data-test="diagram-name"]').setValue('Colored')
    const editor = wrapper.findComponent(FrettedDiagramEditor)
    await editor.vm.$emit('toggle-cell', { string: 1, fret: 3 })
    await wrapper.get('[data-test="root-note-select"]').setValue('G')
    await selectClassification(wrapper)

    await openColorMenu(wrapper)
    await wrapper.get(`[data-test="color-swatch-${COLOR_PALETTE[5].key}"]`).trigger('click')
    const positionId = wrapper.findComponent(FrettedDiagramEditor).props('positions')[0]!.id
    await editor.vm.$emit('set-color', positionId, COLOR_PALETTE[0].hex)

    expect(wrapper.findComponent(FrettedDiagramEditor).props('color')).toBe(COLOR_PALETTE[5].hex)

    await wrapper.findComponent({ name: 'AppBar' }).props('onSave')!()

    expect(POST).toHaveBeenCalledWith(
      '/diagrams',
      expect.objectContaining({
        body: expect.objectContaining({
          color: COLOR_PALETTE[5].hex,
          positions: [expect.objectContaining({ color: COLOR_PALETTE[0].hex })],
        }),
      }),
    )
  })

  it('offers only the fixed palette for the general color, with a way back to the default', async () => {
    GET.mockResolvedValueOnce({ data: [guitar], error: undefined, response: { status: 200 } })
    const wrapper = mountView()
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.get('[data-test="instrument-option"]').trigger('click')

    expect(wrapper.find('[data-test="color-palette"]').exists()).toBe(false)
    await openColorMenu(wrapper)

    const palette = wrapper.get('[data-test="color-palette"]')
    expect(palette.findAll('[data-test^="color-swatch-"]')).toHaveLength(COLOR_PALETTE.length)
    expect(palette.find('[data-test="color-palette-clear"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('input[type="color"]').exists()).toBe(false)
  })

  it('lets the general color be cleared while unsaved, and locks that once a color has been saved', async () => {
    GET.mockResolvedValueOnce({ data: [guitar], error: undefined, response: { status: 200 } })
    POST.mockResolvedValueOnce({
      data: {
        diagram_id: 'd-new',
        instrument_id: 'i-1',
        name: 'Colored',
        root_note: 'G',
        label_display: 'interval',
        color: '#3B82F6',
        positions: [],
        classification: { skills: [], concepts: [] },
        created_at: '2026-09-23T00:00:00Z',
      },
      error: undefined,
      response: { status: 201 },
    })
    const wrapper = mountView()
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.get('[data-test="instrument-option"]').trigger('click')
    await wrapper.get('input[data-test="diagram-name"]').setValue('Colored')
    await wrapper.findComponent(FrettedDiagramEditor).vm.$emit('toggle-cell', { string: 1, fret: 3 })
    await wrapper.get('[data-test="root-note-select"]').setValue('G')
    await selectClassification(wrapper)
    await openColorMenu(wrapper)
    await wrapper.get(`[data-test="color-swatch-${COLOR_PALETTE[5].key}"]`).trigger('click')

    const clearSelector = '[data-test="color-palette-clear"]'
    await openColorMenu(wrapper)
    expect(wrapper.get(clearSelector).attributes('disabled')).toBeUndefined()
    await wrapper.get(clearSelector).trigger('keydown', { key: 'Escape' })

    await wrapper.findComponent({ name: 'AppBar' }).props('onSave')!()
    await new Promise((r) => setTimeout(r, 0))

    await openColorMenu(wrapper)
    expect(wrapper.get(clearSelector).attributes('disabled')).toBeDefined()
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
          kind: 'custom',
          created_by: { user_id: 'u-teacher', display_name: 'Bob Ferreira' },
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
          kind: 'custom',
          created_by: { user_id: 'u-teacher', display_name: 'Bob Ferreira' },
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
          kind: 'custom',
          created_by: { user_id: 'u-teacher', display_name: 'Bob Ferreira' },
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

    it("restores the saved general color and each position's own color when reopened for editing", async () => {
      GET.mockResolvedValueOnce({
        data: {
          diagram_id: 'd-1',
          instrument_id: 'i-1',
          kind: 'custom',
          created_by: { user_id: 'u-teacher', display_name: 'Bob Ferreira' },
          name: 'C Major Scale',
          root_note: 'C',
          label_display: 'interval',
          color: '#3B82F6',
          positions: [
            { position_id: 'p-1', interval: 'R', note_name: 'C', shape: 'dot', color: '#EF4444', string: 2, fret: 1, sequence_index: 0 },
            { position_id: 'p-2', interval: '3', note_name: 'E', shape: 'dot', string: 2, fret: 5, sequence_index: 1 },
          ],
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

      const blue = COLOR_PALETTE.find((c) => c.hex === '#3B82F6')!
      expect(wrapper.get('[data-test="diagram-color-indicator"]').attributes('data-color')).toBe('#3B82F6')
      await openColorMenu(wrapper)
      expect(wrapper.get(`[data-test="color-swatch-${blue.key}"]`).attributes('aria-pressed')).toBe('true')
      const editor = wrapper.findComponent(FrettedDiagramEditor)
      expect(editor.props('color')).toBe('#3B82F6')
      expect(editor.props('positions').map((p: { color: string | null }) => p.color)).toEqual(['#EF4444', null])
      expect(wrapper.findComponent({ name: 'FrettedDiagramView' }).props('diagram').color).toBe('#3B82F6')
    })

    it('does not offer to clear a saved general color, since the API cannot unset it', async () => {
      GET.mockResolvedValueOnce({
        data: {
          diagram_id: 'd-1',
          instrument_id: 'i-1',
          kind: 'custom',
          created_by: { user_id: 'u-teacher', display_name: 'Bob Ferreira' },
          name: 'C Major Scale',
          root_note: 'C',
          label_display: 'interval',
          color: '#3B82F6',
          positions: [{ position_id: 'p-1', interval: 'R', note_name: 'C', shape: 'dot', string: 2, fret: 1, sequence_index: 0 }],
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

      await openColorMenu(wrapper)
      expect(wrapper.get('[data-test="color-palette-clear"]').attributes('disabled')).toBeDefined()
      expect(wrapper.find('[data-test="color-palette-hint"]').exists()).toBe(true)
    })
  })

  describe('ownership and Save as', () => {
    const scale = {
      diagram_id: 'd-1',
      instrument_id: 'i-1',
      name: 'C Major Scale',
      root_note: 'C',
      label_display: 'interval',
      color: null,
      positions: [{ position_id: 'p-1', interval: 'R', note_name: 'C', string: 2, fret: 1, sequence_index: 0 }],
      classification: {
        skills: [{ skill_id: 's-1', name: 'Scales', parent_id: null }],
        concepts: [{ concept_id: 'c-1', name: 'Major', parent_id: null }],
      },
      created_at: '2026-09-22T00:00:00Z',
    }

    async function openDiagram(owner: Pick<Diagram, 'kind' | 'created_by'>) {
      route.params = { id: 'd-1' }
      GET.mockResolvedValueOnce({ data: { ...scale, ...owner }, error: undefined, response: { status: 200 } })
      GET.mockResolvedValueOnce({ data: [guitar], error: undefined, response: { status: 200 } })
      const wrapper = mountView()
      await new Promise((r) => setTimeout(r, 0))
      return wrapper
    }

    const appBarShowsSave = (wrapper: ReturnType<typeof mountView>) =>
      wrapper.findComponent({ name: 'AppBar' }).props('showSave')

    it('lets a teacher save over their own diagram, and offers Save as but not Save as template', async () => {
      const wrapper = await openDiagram({ kind: 'custom', created_by: { user_id: 'u-teacher', display_name: 'Bob Ferreira' } })

      expect(appBarShowsSave(wrapper)).toBe(true)
      expect(wrapper.find('[data-test="save-as"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="save-as-template"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="read-only-notice"]').exists()).toBe(false)
    })

    it('puts every way of saving in the top bar', async () => {
      currentUser.profile.role = 'admin'
      currentUser.profile.user_id = 'u-admin'
      const wrapper = await openDiagram({ kind: 'custom', created_by: { user_id: 'u-teacher', display_name: 'Bob Ferreira' } })

      const appBar = wrapper.findComponent({ name: 'AppBar' })
      expect(appBar.find('[data-test="app-bar-save"]').exists()).toBe(true)
      expect(appBar.find('[data-test="save-as"]').exists()).toBe(true)
      expect(appBar.find('[data-test="save-as-template"]').exists()).toBe(true)
    })

    it('only lets a teacher save a basic template as a copy, and says why', async () => {
      const wrapper = await openDiagram({ kind: 'basic', created_by: { user_id: 'u-admin', display_name: 'Marina Alves' } })

      expect(appBarShowsSave(wrapper)).toBe(false)
      expect(wrapper.find('[data-test="save-as"]').exists()).toBe(true)
      expect(wrapper.get('[data-test="read-only-notice"]').text()).toContain('template')
    })

    it("only lets a teacher save another teacher's diagram as a copy, and says why", async () => {
      const wrapper = await openDiagram({ kind: 'custom', created_by: { user_id: 'u-other', display_name: 'Carol Dias' } })

      expect(appBarShowsSave(wrapper)).toBe(false)
      expect(wrapper.get('[data-test="read-only-notice"]').text()).toContain('another teacher')
    })

    it('lets an admin save over a template and also offers Save as template', async () => {
      currentUser.profile.role = 'admin'
      currentUser.profile.user_id = 'u-admin'
      const wrapper = await openDiagram({ kind: 'basic', created_by: { user_id: 'u-someone', display_name: 'Carol Dias' } })

      expect(appBarShowsSave(wrapper)).toBe(true)
      expect(wrapper.find('[data-test="save-as"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="save-as-template"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="read-only-notice"]').exists()).toBe(false)
    })

    it('saves a copy of a template as a new custom diagram, then keeps editing the copy', async () => {
      const wrapper = await openDiagram({ kind: 'basic', created_by: { user_id: 'u-admin', display_name: 'Marina Alves' } })
      POST.mockResolvedValueOnce({
        data: {
          ...scale,
          diagram_id: 'd-copy',
          name: 'My C Major',
          kind: 'custom',
          created_by: { user_id: 'u-teacher', display_name: 'Bob Ferreira' },
          positions: [{ position_id: 'p-new', interval: 'R', note_name: 'C', string: 2, fret: 1, sequence_index: 0 }],
        },
        error: undefined,
        response: { status: 201 },
      })

      await wrapper.get('[data-test="save-as"]').trigger('click')
      expect((wrapper.get('[data-test="save-as-name"]').element as HTMLInputElement).value).toBe('C Major Scale (copy)')
      await wrapper.get('[data-test="save-as-name"]').setValue('My C Major')
      await wrapper.get('[data-test="save-as-form"]').trigger('submit')
      await new Promise((r) => setTimeout(r, 0))

      expect(POST).toHaveBeenCalledWith(
        '/diagrams',
        expect.objectContaining({
          body: expect.objectContaining({
            name: 'My C Major',
            kind: 'custom',
            positions: [expect.not.objectContaining({ position_id: expect.anything() })],
          }),
        }),
      )
      expect(router.replace).toHaveBeenCalledWith({ name: 'teacher-diagram-edit', params: { id: 'd-copy' } })
      expect(wrapper.find('[data-test="save-as-name"]').exists()).toBe(false)
      expect(appBarShowsSave(wrapper)).toBe(true)
      expect(wrapper.find('[data-test="read-only-notice"]').exists()).toBe(false)
      expect(wrapper.get<HTMLInputElement>('input[data-test="diagram-name"]').element.value).toBe('My C Major')
    })

    it('updates the copy, not the source, on the next save, using the positions the server assigned', async () => {
      const wrapper = await openDiagram({ kind: 'basic', created_by: { user_id: 'u-admin', display_name: 'Marina Alves' } })
      POST.mockResolvedValueOnce({
        data: {
          ...scale,
          diagram_id: 'd-copy',
          name: 'My C Major',
          kind: 'custom',
          created_by: { user_id: 'u-teacher', display_name: 'Bob Ferreira' },
          positions: [{ position_id: 'p-new', interval: 'R', note_name: 'C', string: 2, fret: 1, sequence_index: 0 }],
        },
        error: undefined,
        response: { status: 201 },
      })
      await wrapper.get('[data-test="save-as"]').trigger('click')
      await wrapper.get('[data-test="save-as-form"]').trigger('submit')
      await new Promise((r) => setTimeout(r, 0))

      PATCH.mockResolvedValueOnce({
        data: { ...scale, diagram_id: 'd-copy', kind: 'custom', created_by: { user_id: 'u-teacher', display_name: 'Bob Ferreira' } },
        error: undefined,
        response: { status: 200 },
      })
      await wrapper.findComponent({ name: 'AppBar' }).props('onSave')!()

      expect(PATCH).toHaveBeenCalledWith(
        '/diagrams/{diagram_id}',
        expect.objectContaining({
          params: { path: { diagram_id: 'd-copy' } },
          body: expect.objectContaining({ positions: [expect.objectContaining({ position_id: 'p-new' })] }),
        }),
      )
    })

    it('lets an admin save a copy as a new basic template', async () => {
      currentUser.profile.role = 'admin'
      currentUser.profile.user_id = 'u-admin'
      const wrapper = await openDiagram({ kind: 'custom', created_by: { user_id: 'u-teacher', display_name: 'Bob Ferreira' } })
      POST.mockResolvedValueOnce({
        data: { ...scale, diagram_id: 'd-tpl', name: 'C Major Template', kind: 'basic', created_by: { user_id: 'u-admin', display_name: 'Marina Alves' } },
        error: undefined,
        response: { status: 201 },
      })

      await wrapper.get('[data-test="save-as-template"]').trigger('click')
      expect(wrapper.text()).toContain('Save as template')
      await wrapper.get('[data-test="save-as-name"]').setValue('C Major Template')
      await wrapper.get('[data-test="save-as-form"]').trigger('submit')
      await new Promise((r) => setTimeout(r, 0))

      expect(POST).toHaveBeenCalledWith(
        '/diagrams',
        expect.objectContaining({ body: expect.objectContaining({ name: 'C Major Template', kind: 'basic' }) }),
      )
    })

    it('keeps the dialog open and reports the error when the copy cannot be saved', async () => {
      const wrapper = await openDiagram({ kind: 'basic', created_by: { user_id: 'u-admin', display_name: 'Marina Alves' } })
      POST.mockResolvedValueOnce({ data: undefined, error: { message: 'Could not save' }, response: { status: 500 } })

      await wrapper.get('[data-test="save-as"]').trigger('click')
      await wrapper.get('[data-test="save-as-form"]').trigger('submit')
      await new Promise((r) => setTimeout(r, 0))

      expect(wrapper.find('[data-test="save-as-name"]').exists()).toBe(true)
      expect(router.replace).not.toHaveBeenCalled()
      expect(useToast().toasts.value.some((toast) => toast.kind === 'error')).toBe(true)
    })

    it('does not offer Save as, or a teacher Save as template, for a diagram that has never been saved', () => {
      const wrapper = mountView()

      expect(wrapper.find('[data-test="save-as"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="save-as-template"]').exists()).toBe(false)
    })

    it('lets an admin save a new diagram straight away as a template, under its own name', async () => {
      currentUser.profile.role = 'admin'
      currentUser.profile.user_id = 'u-admin'
      GET.mockResolvedValueOnce({ data: [guitar], error: undefined, response: { status: 200 } })
      POST.mockResolvedValueOnce({
        data: { ...scale, diagram_id: 'd-tpl', name: 'G Major Template', kind: 'basic', created_by: { user_id: 'u-admin', display_name: 'Marina Alves' } },
        error: undefined,
        response: { status: 201 },
      })
      const wrapper = mountView()
      await new Promise((r) => setTimeout(r, 0))
      await wrapper.get('[data-test="instrument-option"]').trigger('click')
      await wrapper.get('input[data-test="diagram-name"]').setValue('G Major Template')
      await wrapper.findComponent(FrettedDiagramEditor).vm.$emit('toggle-cell', { string: 1, fret: 3 })
      await selectClassification(wrapper)
      await wrapper.get('[data-test="root-note-select"]').setValue('G')

      const appBar = wrapper.findComponent({ name: 'AppBar' })
      expect(appBar.find('[data-test="save-as"]').exists()).toBe(false)
      await appBar.get('[data-test="save-as-template"]').trigger('click')
      expect((wrapper.get('[data-test="save-as-name"]').element as HTMLInputElement).value).toBe('G Major Template')
      await wrapper.get('[data-test="save-as-form"]').trigger('submit')
      await new Promise((r) => setTimeout(r, 0))

      expect(POST).toHaveBeenCalledWith(
        '/diagrams',
        expect.objectContaining({ body: expect.objectContaining({ name: 'G Major Template', kind: 'basic' }) }),
      )
      expect(router.replace).toHaveBeenCalledWith({ name: 'teacher-diagram-edit', params: { id: 'd-tpl' } })
      expect(appBarShowsSave(wrapper)).toBe(true)
    })

    it('sends a new diagram as a custom diagram', async () => {
      GET.mockResolvedValueOnce({ data: [guitar], error: undefined, response: { status: 200 } })
      POST.mockResolvedValueOnce({
        data: { ...scale, diagram_id: 'd-new', kind: 'custom', created_by: { user_id: 'u-teacher', display_name: 'Bob Ferreira' } },
        error: undefined,
        response: { status: 201 },
      })
      const wrapper = mountView()
      await new Promise((r) => setTimeout(r, 0))
      await wrapper.get('[data-test="instrument-option"]').trigger('click')
      await wrapper.get('input[data-test="diagram-name"]').setValue('New one')
      await wrapper.findComponent(FrettedDiagramEditor).vm.$emit('toggle-cell', { string: 1, fret: 3 })
      await selectClassification(wrapper)
      await wrapper.get('[data-test="root-note-select"]').setValue('G')

      await wrapper.findComponent({ name: 'AppBar' }).props('onSave')!()

      expect(POST).toHaveBeenCalledWith('/diagrams', expect.objectContaining({ body: expect.objectContaining({ kind: 'custom' }) }))
    })
  })
})
