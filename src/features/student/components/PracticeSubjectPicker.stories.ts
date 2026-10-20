import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'

import type { components } from '@/api/generated/core-domain'
import PracticeShell from '@/shared/components/PracticeShell.vue'

import PracticeSubjectPicker from './PracticeSubjectPicker.vue'

type Subject = components['schemas']['PracticeSubject']

function subject(id: string, en: string, pt: string, fields: Partial<Subject> = {}): Subject {
  return { node_id: id, names: { en, pt_BR: pt }, on_path: false, item_count: 4, level: 'new', current_rung: 'know', ...fields }
}

const list: components['schemas']['PracticeSubjectList'] = {
  instrument_id: 'i-1',
  groups: [
    {
      area_node_id: 'harmony',
      names: { en: 'Harmony', pt_BR: 'Harmonia' },
      subjects: [
        subject('diatonic', 'Diatonic chords', 'Campo harmônico maior', { on_path: true, level: 'learning' }),
        subject('numerals', 'Roman numeral chords', 'Acordes em graus romanos'),
        subject('function', 'Chord function', 'Função dos acordes'),
        subject('progressions', 'Common progressions (I-IV-V, I-V-vi-IV, ii-V-I)', 'Progressões comuns (I-IV-V, I-V-vi-IV, ii-V-I)', { on_path: true }),
      ],
    },
    { area_node_id: 'ear', names: { en: 'Ear', pt_BR: 'Percepção' }, subjects: [subject('intervals', 'Recognise intervals', 'Reconhecer intervalos')] },
    {
      area_node_id: 'fretboard',
      names: { en: 'Fretboard fluency', pt_BR: 'Domínio do braço' },
      subjects: [subject('root-strings', 'Find notes on the E and A strings', 'Localizar notas nas cordas Mi e Lá', { on_path: true, level: 'accurate' })],
    },
    { area_node_id: 'time', names: { en: 'Time and groove', pt_BR: 'Tempo e groove' }, subjects: [subject('pulse', 'Keep a steady pulse', 'Manter o pulso')] },
  ],
}

const meta = {
  title: 'Practice/PracticeSubjectPicker',
  component: PracticeSubjectPicker,
  args: { list, isLoading: false, error: false },
  render: (args) => ({
    components: { PracticeSubjectPicker, PracticeShell },
    setup: () => ({ args }),
    template: '<PracticeShell exit-label="Back to practice"><PracticeSubjectPicker v-bind="args" /></PracticeShell>',
  }),
} satisfies Meta<typeof PracticeSubjectPicker>

export default meta
type Story = StoryObj<typeof meta>

/** Your path's subjects first, with their level only; then the areas to explore. */
export const Default: Story = {}
export const DarkPortuguese: Story = { globals: { theme: 'dark', locale: 'pt-BR' } }

/** Inside an area: its subjects by their knowledge-map names, path ones said so. */
export const InsideAnArea: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Harmony' }))
    await expect(canvas.getByRole('heading', { level: 1, name: 'Harmony' })).toBeVisible()
  },
}

/** Search finds a subject in any area, ignoring accents. */
export const Searching: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByRole('searchbox'), 'chord')
    await expect(canvas.getAllByRole('button', { name: /chord/i }).length).toBeGreaterThan(0)
  },
}

export const Loading: Story = { args: { list: null, isLoading: true } }
export const Failed: Story = { args: { list: null, error: true } }
export const NothingToChoose: Story = { args: { list: { instrument_id: 'i-1', groups: [] } } }
