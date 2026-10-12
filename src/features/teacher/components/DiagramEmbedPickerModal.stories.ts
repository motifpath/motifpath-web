import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import { expect, userEvent, within } from 'storybook/test'

import { makeFrettedDiagram } from '@/shared/testUtils/diagram'
import { endpoints, respondWith } from '@/shared/testUtils/msw/handlers'
import { makeChord, makeVoicing } from '@/shared/testUtils/songChart'

import DiagramEmbedPickerModal from './DiagramEmbedPickerModal.vue'

const amOpen = makeVoicing('am-open', 'chord-am', {
  fret_window: { lowest_fret: 0, highest_fret: 2 },
  fingering: [
    { position_id: 'p2', finger: '1' },
    { position_id: 'p4', finger: '2' },
    { position_id: 'p3', finger: '3' },
  ],
  muted_strings: [6],
})
const am5 = makeVoicing('am-5fr', 'chord-am', {
  recommended_rank: 2,
  shape_family: 'e_shape',
  is_movable: true,
  fret_window: { lowest_fret: 5, highest_fret: 7 },
  fingering: [
    { position_id: 'p6', finger: '1' },
    { position_id: 'p5', finger: '3' },
    { position_id: 'p4', finger: '4' },
  ],
})
const chordAm = makeChord('chord-am', 'Am', [amOpen, am5])

const voicingDiagrams = [
  makeFrettedDiagram({
    diagram_id: amOpen.diagram_id,
    names: { en: 'Am' },
    purpose: 'chord_voicing',
    chord_voicing: amOpen,
    positions: [
      { position_id: 'p5', string: 5, fret: 0, interval: 'R', note_name: 'A', shape: 'dot' },
      { position_id: 'p4', string: 4, fret: 2, interval: '5', note_name: 'E', shape: 'dot' },
      { position_id: 'p3', string: 3, fret: 2, interval: 'R', note_name: 'A', shape: 'dot' },
      { position_id: 'p2', string: 2, fret: 1, interval: 'b3', note_name: 'C', shape: 'dot' },
      { position_id: 'p1', string: 1, fret: 0, interval: '5', note_name: 'E', shape: 'dot' },
    ],
  }),
  makeFrettedDiagram({
    diagram_id: am5.diagram_id,
    names: { en: 'Am' },
    purpose: 'chord_voicing',
    chord_voicing: am5,
    positions: [
      { position_id: 'p6', string: 6, fret: 5, interval: 'R', note_name: 'A', shape: 'dot' },
      { position_id: 'p5', string: 5, fret: 7, interval: '5', note_name: 'E', shape: 'dot' },
      { position_id: 'p4', string: 4, fret: 7, interval: 'R', note_name: 'A', shape: 'dot' },
      { position_id: 'p3', string: 3, fret: 5, interval: 'b3', note_name: 'C', shape: 'dot' },
      { position_id: 'p2', string: 2, fret: 5, interval: '5', note_name: 'E', shape: 'dot' },
      { position_id: 'p1', string: 1, fret: 5, interval: 'R', note_name: 'A', shape: 'dot' },
    ],
  }),
]

const library = [
  makeFrettedDiagram({ diagram_id: 'd-am-penta', names: { en: 'A minor pentatonic — open' }, root_note: 'A' }),
  makeFrettedDiagram({ diagram_id: 'd-c-major', names: { en: 'C major scale' }, kind: 'basic', root_note: 'C' }),
  makeFrettedDiagram({ diagram_id: 'd-e-blues', names: { en: 'E blues — box 1' }, root_note: 'E' }),
  makeFrettedDiagram({ diagram_id: 'd-g-major', names: { en: 'G major triads' }, kind: 'basic', root_note: 'G' }),
]

const meta = {
  title: 'Teacher/DiagramEmbedPickerModal',
  component: DiagramEmbedPickerModal,
  args: { open: true, initial: null, editing: false },
  parameters: {
    msw: {
      handlers: {
        diagrams: respondWith('diagrams', { items: library, total: 126, limit: 20, offset: 0 }),
        diagram: http.get(endpoints.diagram, ({ params }) => {
          const found = [...voicingDiagrams, ...library].find((d) => d.diagram_id === params.diagram_id)
          return found ? HttpResponse.json(found) : HttpResponse.json({ message: 'Not found' }, { status: 404 })
        }),
        chords: http.get(endpoints.chords, ({ request }) => {
          const symbol = new URL(request.url).searchParams.get('symbol') ?? ''
          return HttpResponse.json({ written_symbol: symbol, status: 'parsed', parsed: null, warning: null, chord: symbol === 'Am' ? chordAm : null, chord_without_bass: null })
        }),
      },
    },
    docs: {
      description: {
        component:
          'One picker wherever a diagram goes, in two steps: choose a diagram or a chord, then set how it shows. A full-screen layer on a phone, a 1040 px dialog otherwise; the search and filters stay put while the results scroll.',
      },
    },
  },
} satisfies Meta<typeof DiagramEmbedPickerModal>

export default meta

/** The mocked catalog and diagrams answer slowly when every story runs at once. */
const LOADED = 5000
type Story = StoryObj<typeof meta>

/** Diagrams: the search, Root, Type and Author inline, with the count. */
export const Default: Story = {}

/** Chords: a typed symbol is read in any case, each voicing named by its chord and where it sits. */
export const Chords: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(await body.findByRole('button', { name: /chords|acordes/i }, { timeout: LOADED }))
    await userEvent.type(body.getByPlaceholderText(/am7/), 'am')
    await expect(await body.findByText('Am · Open', {}, { timeout: LOADED })).toBeVisible()
  },
}

/** A picked chord's settings: its chord box, with Box | Neck, and Insert beside Cancel. */
export const ChordSettings: Story = {
  play: async (context) => {
    await Chords.play!(context)
    const body = within(context.canvasElement.ownerDocument.body)
    await userEvent.click((await body.findByText('Am · Open', {}, { timeout: LOADED })).closest('button')!)
    await expect(await body.findByRole('radio', { name: /box|caixa/i }, { timeout: LOADED })).toBeChecked()
    await expect(body.getByRole('button', { name: /insert|inserir/i })).toBeVisible()
  },
}
