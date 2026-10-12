import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { diagram as sampleDiagram } from '@/shared/testUtils/msw/fixtures'
import { respondWith } from '@/shared/testUtils/msw/handlers'

import DiagramListView from './DiagramListView.vue'

const NAMES = [
  'A minor pentatonic',
  'A minor pentatonic — box 2',
  'A minor pentatonic — box 3',
  'A minor pentatonic — box 4',
  'A minor pentatonic — box 5',
  'A minor pentatonic — open',
  'A minor pent. — 2 octaves',
  'A minor pent. — 3 notes/str.',
]

const diagrams = NAMES.map((name, index) => ({
  ...sampleDiagram,
  diagram_id: `diagram-${index}`,
  names: { en: name },
  kind: index === 0 ? ('basic' as const) : ('custom' as const),
  root_note: 'A',
}))

/** The catalog's instruments, as teachers see them (the shared fixture names its own test tuning). */
const instruments = [
  makeFrettedInstrument({ instrument_id: sampleDiagram.instrument_id, names: { en: 'Acoustic guitar', pt_BR: 'Violão' } }),
  makeFrettedInstrument({ instrument_id: 'instrument-electric-guitar', names: { en: 'Electric guitar', pt_BR: 'Guitarra elétrica' } }),
  makeFrettedInstrument({ instrument_id: 'instrument-electric-bass', names: { en: 'Electric bass', pt_BR: 'Contrabaixo elétrico' }, string_count: 4, tuning: ['E1', 'A1', 'D2', 'G2'] }),
]

const meta = {
  title: 'Teach/DiagramListView',
  component: DiagramListView,
  globals: { role: 'teacher' },
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: {
        diagrams: respondWith('diagrams', { items: diagrams, total: 1284, limit: 20, offset: 0 }),
        instruments: respondWith('instruments', instruments),
      },
    },
  },
} satisfies Meta<typeof DiagramListView>

export default meta
type Story = StoryObj<typeof meta>

export const OnAPhone: Story = { globals: { viewport: { value: 'compact', isRotated: false } } }
export const OnATablet: Story = { globals: { viewport: { value: 'medium', isRotated: false } } }
export const OnAComputer: Story = { globals: { viewport: { value: 'expanded', isRotated: false } } }
