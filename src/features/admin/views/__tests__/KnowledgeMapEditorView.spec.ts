import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, reactive } from 'vue'
import { createMemoryHistory, createRouter, RouterView, type Router } from 'vue-router'

const GET = vi.fn()
const POST = vi.fn()
const PATCH = vi.fn()
const DELETE = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET, POST, PATCH, DELETE }, eventApi: {} }),
}))

const currentUser = reactive({ profile: { user_id: 'u-admin', role: 'admin' as const } })
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

import KnowledgeMapEditorView from '@/features/admin/views/KnowledgeMapEditorView.vue'
import { useToast } from '@/shared/composables/useToast'
import type { components } from '@/api/generated/core-domain'

type KnowledgeNode = components['schemas']['KnowledgeNode']
type KnowledgeEdge = components['schemas']['KnowledgeEdge']

const guitars = ['i-electric', 'i-acoustic']

function node(
  node_id: string,
  kind: 'skill' | 'concept',
  name: string,
  parent_id: string | null,
  instrument_ids: string[] = [],
): KnowledgeNode {
  return {
    node_id,
    kind,
    key: node_id,
    names: { en: name, pt_BR: `${name} (pt)` },
    descriptions: null,
    languages: ['en', 'pt_BR'],
    parent_id,
    instrument_ids,
  }
}

let nodes: KnowledgeNode[]
let edges: KnowledgeEdge[]

const instruments = [
  { instrument_id: 'i-electric', names: { en: 'Electric guitar' }, languages: ['en'] },
  { instrument_id: 'i-acoustic', names: { en: 'Acoustic guitar' }, languages: ['en'] },
  { instrument_id: 'i-bass', names: { en: 'Electric bass' }, languages: ['en'] },
]

function ok(data: unknown, status = 200) {
  return { data, error: undefined, response: { status } }
}

function refused(status: number, message: string) {
  return { data: undefined, error: { message }, response: { status } }
}

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

let router: Router

async function mountEditor(query: Record<string, string> = {}) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: defineComponent({ template: '<div />' }) },
      { path: '/admin/knowledge-map', name: 'admin-knowledge-map', component: KnowledgeMapEditorView },
    ],
  })
  await router.push({ name: 'admin-knowledge-map', query })
  await router.isReady()
  const wrapper = mount(defineComponent({ components: { RouterView }, template: '<RouterView />' }), {
    global: { plugins: [createPinia(), router], stubs: { AppBar: true } },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

type Wrapper = Awaited<ReturnType<typeof mountEditor>>

function treeRow(wrapper: Wrapper, id: string) {
  return wrapper
    .get('[data-test="kmap-tree-pane"]')
    .findAll('[data-test="kmap-tree-select"]')
    .find((row) => row.attributes('data-node-id') === id)
}

async function select(wrapper: Wrapper, id: string) {
  await treeRow(wrapper, id)!.trigger('click')
  await flushPromises()
}

describe('KnowledgeMapEditorView', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    document.body.innerHTML = ''
    useToast().clear()
    mockMatchMedia(false)
    nodes = [
      node('terms', 'concept', 'Technique terms', null),
      node('bending', 'concept', 'Bending', 'terms'),
      node('lead', 'skill', 'Lead techniques', null, guitars),
      node('bends', 'skill', 'Bends', 'lead', guitars),
      node('unison', 'skill', 'Unison bends', 'bends', guitars),
      node('vibrato', 'skill', 'Vibrato', 'lead', guitars),
      node('expressive', 'skill', 'Expressive techniques', null),
    ]
    edges = [
      { edge_id: 'e-applies', from_id: 'bends', to_id: 'bending', type: 'applies', level: null },
      { edge_id: 'e-requires', from_id: 'vibrato', to_id: 'bends', type: 'requires', level: 'fluent' },
    ]
    GET.mockImplementation((path: string) => {
      // A real response is freshly parsed every time, never the objects already on screen.
      if (path === '/knowledge-nodes') return Promise.resolve(ok(structuredClone(nodes)))
      if (path === '/knowledge-edges') return Promise.resolve(ok(structuredClone(edges)))
      if (path === '/instruments') return Promise.resolve(ok(instruments))
      return Promise.resolve(ok([]))
    })
  })

  describe('browsing', () => {
    it('opens on the concept tree, before skills, with nothing selected', async () => {
      const wrapper = await mountEditor()

      const tabs = wrapper.findAll('[data-test^="kmap-tab-"]').map((tab) => tab.attributes('data-test'))
      expect(tabs).toEqual(['kmap-tab-concept', 'kmap-tab-skill'])
      expect(wrapper.get('[data-test="kmap-tab-concept"]').text()).toBe('Concepts (2)')
      expect(wrapper.get('[data-test="kmap-tab-concept"]').attributes('aria-selected')).toBe('true')
      expect(wrapper.get('[data-test="kmap-empty"]').text()).toBe('Pick a node, or create one.')
    })

    it('shows the selected node and records it in the URL', async () => {
      const wrapper = await mountEditor()
      await wrapper.get('[data-test="kmap-tab-skill"]').trigger('click')
      await flushPromises()
      await wrapper.get('[data-test="kmap-tree-pane"] [data-test="kmap-tree-toggle"][data-node-id="lead"]').trigger('click')

      await select(wrapper, 'bends')

      expect(router.currentRoute.value.query).toEqual({ tree: 'skill', node: 'bends' })
      expect(wrapper.get('[data-test="kmap-node-heading"]').text()).toBe('Bends')
      expect(wrapper.get('[data-test="kmap-node-key"]').text()).toBe('bends')
      expect(wrapper.get('[data-test="kmap-breadcrumb"]').text()).toContain('Lead techniques')
    })

    it('opens a linked node on its tree, with the path to it expanded', async () => {
      const wrapper = await mountEditor({ node: 'unison' })

      expect(wrapper.get('[data-test="kmap-tab-skill"]').attributes('aria-selected')).toBe('true')
      expect(treeRow(wrapper, 'unison')).toBeDefined()
      expect(wrapper.get('[data-test="kmap-node-heading"]').text()).toBe('Unison bends')
    })

    it('says so when a linked node no longer exists', async () => {
      const wrapper = await mountEditor({ node: 'gone' })

      expect(wrapper.get('[data-test="kmap-missing"]').text()).toBe('This node no longer exists.')
    })

    it('selects a node from the breadcrumb and from a link', async () => {
      const wrapper = await mountEditor({ node: 'bends' })

      await wrapper.get('[data-test="kmap-links-required-by"] [data-test="kmap-link-node"]').trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.query.node).toBe('vibrato')

      await wrapper.get('[data-test="kmap-breadcrumb"] button').trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.query.node).toBe('lead')
    })

    it('offers a retry when the map fails to load', async () => {
      GET.mockImplementationOnce(() => Promise.resolve(refused(500, 'boom')))
      const wrapper = await mountEditor()

      expect(wrapper.find('[data-test="kmap-load-error"]').exists()).toBe(true)
      await wrapper.get('[data-test="kmap-load-error"] button').trigger('click')
      await flushPromises()
      expect(wrapper.find('[data-test="kmap-load-error"]').exists()).toBe(false)
    })
  })

  describe('creating', () => {
    it('creates a child of the selected node and selects it', async () => {
      const wrapper = await mountEditor({ node: 'bends' })
      await wrapper.get('[data-test="kmap-add-child"]').trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.query).toEqual({ tree: 'skill', new: 'skill', parent: 'bends' })
      expect(wrapper.get('[data-test="kmap-parent"]').text()).toBe('Bends')

      await wrapper.get('[data-test="kmap-name-en"]').setValue('Pre-bends')
      await wrapper.get('[data-test="kmap-name-pt_BR"]').setValue('Pré-bends')
      const created = node('pre-bends', 'skill', 'Pre-bends', 'bends', guitars)
      POST.mockImplementationOnce(() => {
        nodes = [...nodes, created]
        return Promise.resolve(ok(created, 201))
      })
      await wrapper.get('[data-test="kmap-save"]').trigger('click')
      await flushPromises()

      expect(POST).toHaveBeenCalledWith('/knowledge-nodes', {
        body: {
          kind: 'skill',
          key: 'pre-bends',
          names: { en: 'Pre-bends', pt_BR: 'Pré-bends' },
          parent_id: 'bends',
          instrument_ids: guitars,
        },
      })
      expect(router.currentRoute.value.query).toEqual({ tree: 'skill', node: 'pre-bends' })
      expect(wrapper.find('[data-test="kmap-discard-dialog"]').exists()).toBe(false)
      expect(treeRow(wrapper, 'pre-bends')).toBeDefined()
    })

    it('starts a root of the open tree and lets the admin pick a parent', async () => {
      const wrapper = await mountEditor({ tree: 'skill' })
      await wrapper.get('[data-test="kmap-new"]').trigger('click')
      await flushPromises()
      expect(wrapper.get('[data-test="kmap-new"]').text()).toBe('New skill')
      expect(wrapper.get('[data-test="kmap-parent"]').text()).toBe('No parent — a root')

      await wrapper.get('[data-test="kmap-change-parent"]').trigger('click')
      const picker = wrapper.get('[data-test="kmap-node-picker"]')
      await picker.findAll('[data-test="kmap-tree-select"]').find((row) => row.attributes('data-node-id') === 'expressive')!.trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-test="kmap-parent"]').text()).toBe('Expressive techniques')
      expect(router.currentRoute.value.query.parent).toBe('expressive')
    })

    it('shows a key the server refused next to the form', async () => {
      const wrapper = await mountEditor({ tree: 'concept', new: 'concept' })
      // Another admin took the key after this editor loaded the map.
      await wrapper.get('[data-test="kmap-name-en"]').setValue('Tremolo')
      await wrapper.get('[data-test="kmap-name-pt_BR"]').setValue('Tremolo')
      POST.mockResolvedValueOnce(refused(409, 'a knowledge node with key tremolo already exists'))

      await wrapper.get('[data-test="kmap-save"]').trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-test="kmap-form-error"]').text()).toBe('A knowledge node with key tremolo already exists')
    })
  })

  describe('editing', () => {
    it('saves a change and keeps the node selected', async () => {
      const wrapper = await mountEditor({ node: 'bends' })
      await wrapper.get('[data-test="kmap-name-pt_BR"]').setValue('Curvas')
      PATCH.mockImplementationOnce(() => {
        nodes = nodes.map((n) => (n.node_id === 'bends' ? { ...n, names: { en: 'Bends', pt_BR: 'Curvas' } } : n))
        return Promise.resolve(ok(nodes.find((n) => n.node_id === 'bends')))
      })

      await wrapper.get('[data-test="kmap-save"]').trigger('click')
      await flushPromises()

      expect(PATCH).toHaveBeenCalledWith('/knowledge-nodes/{node_id}', {
        params: { path: { node_id: 'bends' } },
        body: { names: { en: 'Bends', pt_BR: 'Curvas' } },
      })
      expect(wrapper.get('[data-test="kmap-save"]').attributes('disabled')).toBeDefined()
      expect(useToast().toasts.value.map((toast) => toast.kind)).toEqual(['success'])
    })

    it('explains a refused narrowing under the instruments and keeps the change', async () => {
      const wrapper = await mountEditor({ node: 'bends' })
      await wrapper.get('[data-test="instrument-option-i-acoustic"]').trigger('click')
      PATCH.mockResolvedValueOnce(refused(409, 'content for acoustic guitar is classified under this node'))

      await wrapper.get('[data-test="kmap-save"]').trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-test="kmap-instruments-error"]').text()).toBe(
        'Content for acoustic guitar is classified under this node',
      )
      expect(wrapper.get('[data-test="instrument-option-i-acoustic"]').attributes('aria-pressed')).toBe('false')
    })

    it('explains instruments the server finds wider than the parent under the instruments', async () => {
      const wrapper = await mountEditor({ node: 'expressive' })
      await wrapper.get('[data-test="instrument-option-i-bass"]').trigger('click')
      PATCH.mockResolvedValueOnce({
        data: undefined,
        error: {
          message: 'request failed validation',
          errors: [{ field: 'instrument_ids', reason: 'must stay within the parent instruments' }],
        },
        response: { status: 400 },
      })

      await wrapper.get('[data-test="kmap-save"]').trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-test="kmap-instruments-error"]').text()).toBe(
        'Request failed validation: must stay within the parent instruments',
      )
      expect(wrapper.find('[data-test="kmap-form-error"]').exists()).toBe(false)
    })

    it('reports a save that never reached the server in a toast', async () => {
      const wrapper = await mountEditor({ node: 'bends' })
      await wrapper.get('[data-test="kmap-name-pt_BR"]').setValue('Curvas')
      PATCH.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await wrapper.get('[data-test="kmap-save"]').trigger('click')
      await flushPromises()

      expect(useToast().toasts.value.map((toast) => toast.kind)).toEqual(['error'])
      expect((wrapper.get('[data-test="kmap-name-pt_BR"]').element as HTMLInputElement).value).toBe('Curvas')
    })

    it('keeps an unsaved rename while the admin edits links or moves the node', async () => {
      const wrapper = await mountEditor({ node: 'bends' })
      await wrapper.get('[data-test="kmap-name-en"]').setValue('Bending notes')

      POST.mockResolvedValueOnce(ok({ edge_id: 'e-new', from_id: 'bends', to_id: 'terms', type: 'requires', level: 'accurate' }, 201))
      await wrapper.get('[data-test="kmap-add-requires"]').trigger('click')
      const picker = wrapper.get('[data-test="kmap-node-picker"]')
      await picker.findAll('[data-test="kmap-tree-select"]').find((row) => row.attributes('data-node-id') === 'terms')!.trigger('click')
      await flushPromises()
      expect(POST).toHaveBeenCalled()
      expect((wrapper.get('[data-test="kmap-name-en"]').element as HTMLInputElement).value).toBe('Bending notes')

      await wrapper.get('[data-test="kmap-move"]').trigger('click')
      await wrapper.get('[data-test="kmap-move-root"]').trigger('click')
      PATCH.mockResolvedValueOnce(ok(node('bends', 'skill', 'Bends', null, guitars)))
      await wrapper.get('[data-test="kmap-move-confirm"]').trigger('click')
      await flushPromises()
      expect((wrapper.get('[data-test="kmap-name-en"]').element as HTMLInputElement).value).toBe('Bending notes')

      await select(wrapper, 'lead')
      expect(wrapper.find('[data-test="kmap-discard-dialog"]').exists()).toBe(true)
    })

    it('asks before discarding unsaved changes, and stays when the admin cancels', async () => {
      const wrapper = await mountEditor({ node: 'bends' })
      await wrapper.get('[data-test="kmap-name-en"]').setValue('Bending notes')

      await select(wrapper, 'lead')
      expect(wrapper.get('[data-test="kmap-discard-dialog"]').text()).toContain('Discard your changes?')
      await wrapper.get('[data-test="kmap-discard-dialog"] [data-test="confirm-dialog-cancel"]').trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.query.node).toBe('bends')

      await select(wrapper, 'lead')
      await wrapper.get('[data-test="kmap-discard-dialog"] [data-test="confirm-dialog-confirm"]').trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.query.node).toBe('lead')
    })
  })

  describe('moving and deleting', () => {
    it('moves a node under the parent confirmed in the modal', async () => {
      const wrapper = await mountEditor({ node: 'bends' })
      await wrapper.get('[data-test="kmap-move"]').trigger('click')
      const modal = () => wrapper.get('[role="dialog"]')
      await modal().findAll('[data-test="kmap-tree-select"]').find((row) => row.attributes('data-node-id') === 'expressive')!.trigger('click')
      PATCH.mockResolvedValueOnce(ok(node('bends', 'skill', 'Bends', 'expressive', guitars)))

      await wrapper.get('[data-test="kmap-move-confirm"]').trigger('click')
      await flushPromises()

      expect(PATCH).toHaveBeenCalledWith('/knowledge-nodes/{node_id}', {
        params: { path: { node_id: 'bends' } },
        body: { parent_id: 'expressive' },
      })
      expect(wrapper.find('[data-test="kmap-move-confirm"]').exists()).toBe(false)
    })

    it('keeps the move modal open with the reason when the server refuses', async () => {
      const wrapper = await mountEditor({ node: 'bends' })
      await wrapper.get('[data-test="kmap-move"]').trigger('click')
      await wrapper.get('[data-test="kmap-move-root"]').trigger('click')
      PATCH.mockResolvedValueOnce(refused(409, 'would create a cycle'))

      await wrapper.get('[data-test="kmap-move-confirm"]').trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-test="kmap-move-error"]').text()).toBe('Would create a cycle')
    })

    it('deletes an unused node and selects its parent', async () => {
      const wrapper = await mountEditor({ node: 'unison' })
      await wrapper.get('[data-test="kmap-delete"]').trigger('click')
      DELETE.mockImplementationOnce(() => {
        nodes = nodes.filter((n) => n.node_id !== 'unison')
        return Promise.resolve({ data: undefined, error: undefined, response: { status: 204 } })
      })

      await wrapper.get('[data-test="kmap-delete-confirm"]').trigger('click')
      await flushPromises()

      expect(DELETE).toHaveBeenCalledWith('/knowledge-nodes/{node_id}', { params: { path: { node_id: 'unison' } } })
      expect(router.currentRoute.value.query).toEqual({ tree: 'skill', node: 'bends' })
      expect(treeRow(wrapper, 'unison')).toBeUndefined()
    })

    it("shows the server's reason for a refused delete in the modal", async () => {
      const wrapper = await mountEditor({ node: 'unison' })
      await wrapper.get('[data-test="kmap-delete"]').trigger('click')
      DELETE.mockResolvedValueOnce(refused(409, 'an exercise is classified under this node'))

      await wrapper.get('[data-test="kmap-delete-confirm"]').trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-test="kmap-delete-error"]').text()).toBe('An exercise is classified under this node')
    })
  })

  describe('links', () => {
    it('adds a requires link and changes a level', async () => {
      const wrapper = await mountEditor({ node: 'vibrato' })
      PATCH.mockResolvedValueOnce(ok({ ...edges[1], level: 'retained' }))

      await wrapper.get('[data-test="kmap-links-requires"] [data-test="kmap-link-level"]').setValue('retained')
      await flushPromises()

      expect(PATCH).toHaveBeenCalledWith('/knowledge-edges/{edge_id}', {
        params: { path: { edge_id: 'e-requires' } },
        body: { level: 'retained' },
      })
    })

    it('sends one removal when the admin double-clicks remove', async () => {
      const wrapper = await mountEditor({ node: 'bends' })
      let settle!: () => void
      DELETE.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            settle = () => resolve({ data: undefined, error: undefined, response: { status: 204 } })
          }),
      )

      const remove = wrapper.get('[data-test="kmap-links-applies"] [data-test="kmap-link-remove"]')
      await remove.trigger('click')
      await remove.trigger('click')
      settle()
      await flushPromises()

      expect(DELETE).toHaveBeenCalledTimes(1)
    })

    it("shows a refused link's reason under its list", async () => {
      const wrapper = await mountEditor({ node: 'bends' })
      DELETE.mockResolvedValueOnce(refused(404, 'knowledge edge not found'))

      await wrapper.get('[data-test="kmap-links-applies"] [data-test="kmap-link-remove"]').trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-test="kmap-links-applies"] [data-test="kmap-links-error"]').text()).toBe(
        'Knowledge edge not found',
      )
    })
  })

  describe('on a phone', () => {
    it('shows the tree, then the node on its own with a way back', async () => {
      mockMatchMedia(true)
      const wrapper = await mountEditor({ tree: 'skill' })
      expect(wrapper.find('[data-test="kmap-tree-pane"]').exists()).toBe(true)

      await select(wrapper, 'lead')

      expect(wrapper.find('[data-test="kmap-tree-pane"]').exists()).toBe(false)
      await wrapper.get('[data-test="kmap-back"]').trigger('click')
      await flushPromises()
      expect(wrapper.find('[data-test="kmap-tree-pane"]').exists()).toBe(true)
      expect(router.currentRoute.value.query).toEqual({ tree: 'skill' })
    })
  })
})
