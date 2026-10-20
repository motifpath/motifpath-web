import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import KnowledgeNodeForm from '@/features/admin/components/KnowledgeNodeForm.vue'
import type { components } from '@/api/generated/core-domain'

type KnowledgeNode = components['schemas']['KnowledgeNode']

const instruments = [
  { instrument_id: 'i-electric', names: { en: 'Electric guitar' }, languages: ['en'] },
  { instrument_id: 'i-acoustic', names: { en: 'Acoustic guitar' }, languages: ['en'] },
  { instrument_id: 'i-bass', names: { en: 'Electric bass' }, languages: ['en'] },
]

function node(overrides: Partial<KnowledgeNode> = {}): KnowledgeNode {
  return {
    node_id: 'n-bends',
    kind: 'skill',
    key: 'bends',
    names: { en: 'Bends', pt_BR: 'Bends' },
    descriptions: null,
    languages: ['en', 'pt_BR'],
    parent_id: 'n-lead',
    instrument_ids: ['i-electric', 'i-acoustic'],
    ...overrides,
  }
}

const lead = node({ node_id: 'n-lead', key: 'lead-techniques', names: { en: 'Lead techniques', pt_BR: 'Técnicas de solo' }, parent_id: null })

type Props = InstanceType<typeof KnowledgeNodeForm>['$props']

async function mountForm(props: Partial<Props> = {}) {
  const wrapper = mount(KnowledgeNodeForm, {
    props: { kind: 'skill', node: null, parent: null, existingKeys: ['bends', 'lead-techniques'], ...props },
  })
  await flushPromises()
  return wrapper
}

async function fillNames(wrapper: Awaited<ReturnType<typeof mountForm>>, en: string, ptBr: string) {
  await wrapper.get('[data-test="kmap-name-en"]').setValue(en)
  await wrapper.get('[data-test="kmap-name-pt_BR"]').setValue(ptBr)
}

describe('KnowledgeNodeForm', () => {
  beforeEach(() => {
    GET.mockReset()
    GET.mockResolvedValue({ data: instruments, error: undefined, response: { status: 200 } })
  })

  describe('creating', () => {
    it('suggests the key from the English name until the admin edits it', async () => {
      const wrapper = await mountForm({ parent: node() })

      await wrapper.get('[data-test="kmap-name-en"]').setValue('Pre-bends & releases')
      expect((wrapper.get('[data-test="kmap-key"]').element as HTMLInputElement).value).toBe('pre-bends-releases')

      await wrapper.get('[data-test="kmap-key"]').setValue('pre-bend-release')
      await wrapper.get('[data-test="kmap-name-en"]').setValue('Pre-bends')
      expect((wrapper.get('[data-test="kmap-key"]').element as HTMLInputElement).value).toBe('pre-bend-release')
    })

    it('catches a key already in use before saving', async () => {
      const wrapper = await mountForm({ kind: 'concept' })
      await fillNames(wrapper, 'Bending', 'Curvas')
      await wrapper.get('[data-test="kmap-key"]').setValue('bends')

      expect(wrapper.get('[data-test="kmap-key-error"]').text()).toContain('already in use')
      expect(wrapper.get('[data-test="kmap-save"]').attributes('disabled')).toBeDefined()
    })

    it('catches a key that is not lowercase kebab-case', async () => {
      const wrapper = await mountForm()
      await fillNames(wrapper, 'Bending', 'Curvas')
      await wrapper.get('[data-test="kmap-key"]').setValue('Bending_1')

      expect(wrapper.get('[data-test="kmap-key-error"]').text()).toContain('lowercase')
      expect(wrapper.get('[data-test="kmap-save"]').attributes('disabled')).toBeDefined()
    })

    it('waits for a name in every language', async () => {
      const wrapper = await mountForm()
      await wrapper.get('[data-test="kmap-name-en"]').setValue('Vibrato')

      expect(wrapper.get('[data-test="kmap-save"]').attributes('disabled')).toBeDefined()

      await wrapper.get('[data-test="kmap-name-pt_BR"]').setValue('Vibrato')
      expect(wrapper.get('[data-test="kmap-save"]').attributes('disabled')).toBeUndefined()
    })

    it("starts a child on its parent's instruments and never lets it be wider", async () => {
      const wrapper = await mountForm({ parent: node() })

      expect(wrapper.get('[data-test="instrument-option-i-electric"]').attributes('aria-pressed')).toBe('true')
      expect(wrapper.get('[data-test="instrument-option-i-acoustic"]').attributes('aria-pressed')).toBe('true')
      expect(wrapper.get('[data-test="instrument-every"]').attributes('disabled')).toBeDefined()
      expect(wrapper.get('[data-test="instrument-option-i-bass"]').attributes('disabled')).toBeDefined()
      expect(wrapper.get('[data-test="instruments-limit-note"]').text()).toContain('wider than its parent')
    })

    it('names the parent, or says the node is a root, and lets the admin change it', async () => {
      const root = await mountForm()
      expect(root.get('[data-test="kmap-parent"]').text()).toContain('No parent')

      const child = await mountForm({ parent: lead })
      expect(child.get('[data-test="kmap-parent"]').text()).toContain('Lead techniques')
      await child.get('[data-test="kmap-change-parent"]').trigger('click')
      expect(child.emitted('changeParent')).toHaveLength(1)
    })

    it('asks for a description in every language or none', async () => {
      const wrapper = await mountForm()
      await fillNames(wrapper, 'Vibrato', 'Vibrato')
      await wrapper.get('[data-test="kmap-description-en"]').setValue('Pitch wobble')

      expect(wrapper.find('[data-test="kmap-descriptions-error"]').exists()).toBe(true)
      expect(wrapper.get('[data-test="kmap-save"]').attributes('disabled')).toBeDefined()
    })

    it('emits the new node, leaving out an empty description', async () => {
      const wrapper = await mountForm({ parent: lead })
      await fillNames(wrapper, 'Vibrato', 'Vibrato')

      await wrapper.get('[data-test="kmap-save"]').trigger('click')

      expect(wrapper.emitted('create')).toEqual([
        [
          {
            kind: 'skill',
            key: 'vibrato',
            names: { en: 'Vibrato', pt_BR: 'Vibrato' },
            parent_id: 'n-lead',
            instrument_ids: ['i-electric', 'i-acoustic'],
          },
        ],
      ])
    })

    it('trims names and keeps a full description', async () => {
      const wrapper = await mountForm()
      await fillNames(wrapper, ' Vibrato ', 'Vibrato')
      await wrapper.get('[data-test="kmap-description-en"]').setValue('Pitch wobble')
      await wrapper.get('[data-test="kmap-description-pt_BR"]').setValue('Oscilação')

      await wrapper.get('[data-test="kmap-save"]').trigger('click')

      expect(wrapper.emitted('create')![0]![0]).toMatchObject({
        names: { en: 'Vibrato', pt_BR: 'Vibrato' },
        descriptions: { en: 'Pitch wobble', pt_BR: 'Oscilação' },
        instrument_ids: [],
      })
      expect(wrapper.emitted('create')![0]![0]).not.toHaveProperty('parent_id')
    })
  })

  describe('editing', () => {
    it('shows the key read-only, because keys never change', async () => {
      const wrapper = await mountForm({ node: node(), parent: lead })

      expect(wrapper.find('input[data-test="kmap-key"]').exists()).toBe(false)
      expect(wrapper.get('[data-test="kmap-key-readonly"]').text()).toContain('bends')
      expect(wrapper.text()).toContain('Keys never change.')
    })

    it('keeps Save disabled until something changes, then sends only what changed', async () => {
      const wrapper = await mountForm({ node: node(), parent: lead })
      expect(wrapper.get('[data-test="kmap-save"]').attributes('disabled')).toBeDefined()

      await wrapper.get('[data-test="kmap-name-pt_BR"]').setValue('Curvas')
      await wrapper.get('[data-test="kmap-save"]').trigger('click')

      expect(wrapper.emitted('update')).toEqual([[{ names: { en: 'Bends', pt_BR: 'Curvas' } }]])
    })

    it('removes the description when both are cleared', async () => {
      const wrapper = await mountForm({
        node: node({ descriptions: { en: 'Raise the pitch', pt_BR: 'Subir a afinação' } }),
        parent: lead,
      })

      await wrapper.get('[data-test="kmap-description-en"]').setValue('')
      await wrapper.get('[data-test="kmap-description-pt_BR"]').setValue('')
      await wrapper.get('[data-test="kmap-save"]').trigger('click')

      expect(wrapper.emitted('update')).toEqual([[{ descriptions: null }]])
    })

    it('sends a change of instruments', async () => {
      const wrapper = await mountForm({ node: node(), parent: null })

      await wrapper.get('[data-test="instrument-option-i-acoustic"]').trigger('click')
      await wrapper.get('[data-test="kmap-save"]').trigger('click')

      expect(wrapper.emitted('update')).toEqual([[{ instrument_ids: ['i-electric'] }]])
    })

    it("shows the server's reason under the instruments", async () => {
      const wrapper = await mountForm({ node: node(), parent: lead, instrumentsError: 'A lesson for Acoustic guitar uses it' })

      expect(wrapper.get('[data-test="kmap-instruments-error"]').text()).toBe('A lesson for Acoustic guitar uses it')
    })

    it('reports whether it holds unsaved changes, and discards them', async () => {
      const wrapper = await mountForm({ node: node(), parent: lead })

      await wrapper.get('[data-test="kmap-name-en"]').setValue('Bending')
      expect(wrapper.emitted('dirty')!.at(-1)).toEqual([true])

      await wrapper.get('[data-test="kmap-discard"]').trigger('click')
      expect((wrapper.get('[data-test="kmap-name-en"]').element as HTMLInputElement).value).toBe('Bends')
      expect(wrapper.emitted('dirty')!.at(-1)).toEqual([false])
    })

    it('keeps unsaved edits when the same node is reloaded, and takes the new values when clean', async () => {
      const wrapper = await mountForm({ node: node(), parent: lead })
      await wrapper.get('[data-test="kmap-name-en"]').setValue('Bending notes')

      await wrapper.setProps({ node: node({ instrument_ids: ['i-electric', 'i-acoustic'] }) })
      expect((wrapper.get('[data-test="kmap-name-en"]').element as HTMLInputElement).value).toBe('Bending notes')

      await wrapper.get('[data-test="kmap-discard"]').trigger('click')
      await wrapper.setProps({ node: node({ names: { en: 'Bends!', pt_BR: 'Bends' } }) })
      expect((wrapper.get('[data-test="kmap-name-en"]').element as HTMLInputElement).value).toBe('Bends!')
    })

    it('loads the next node when it changes', async () => {
      const wrapper = await mountForm({ node: node(), parent: lead })

      await wrapper.setProps({ node: lead, parent: null })

      expect((wrapper.get('[data-test="kmap-name-en"]').element as HTMLInputElement).value).toBe('Lead techniques')
    })
  })
})
