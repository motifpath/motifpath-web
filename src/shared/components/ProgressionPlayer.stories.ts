import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { drillBass, drillGuitar, drillVoicings } from '@/shared/testUtils/drill'
import { failing } from '@/shared/testUtils/msw/handlers'

import ProgressionPlayer from './ProgressionPlayer.vue'

const { C, F, G, Am, D, Em } = drillVoicings

const meta = {
  title: 'Practice/ProgressionPlayer',
  component: ProgressionPlayer,
  args: {
    source: { chords: [C, F, G, C, Am].map((chord) => chord.diagram), chordInstrument: drillGuitar, bass: null, tempoBpm: 72 },
    bars: ['I', 'IV', 'V', 'I', null],
    subtitle: 'A cadence sets the key, then the chord',
  },
  render: (args) => ({
    components: { ProgressionPlayer },
    setup: () => ({ args }),
    template: '<div class="w-[342px]"><ProgressionPlayer v-bind="args" /></div>',
  }),
} satisfies Meta<typeof ProgressionPlayer>

export default meta
type Story = StoryObj<typeof meta>

/** Hear the chord: the cadence's numerals are given, the chord asked is "?". */
export const CadenceThenChord: Story = {}

/** Hear the chord, accurate on it: only the tonic sets the key. */
export const TonicThenChord: Story = {
  args: {
    source: { chords: [G, Em].map((chord) => chord.diagram), chordInstrument: drillGuitar, bass: null, tempoBpm: 72 },
    bars: ['I', null],
    subtitle: 'The tonic sets the key, then the chord',
  },
}

/** Hear the progression: every bar is asked. */
export const Progression: Story = {
  args: {
    source: { chords: [G, D, Em, C].map((chord) => chord.diagram), chordInstrument: drillGuitar, bass: null, tempoBpm: 72 },
    bars: [null, null, null, null],
    subtitle: 'Four chords, in a key you aren’t told',
  },
}

/** On bass: the same chords, with a line of their roots in the bass's voice. */
export const WithBassLine: Story = {
  args: { source: { chords: [C, F, G, C, Am].map((chord) => chord.diagram), chordInstrument: drillGuitar, bass: { instrument: drillBass, roots: ['C', 'F', 'G', 'C', 'A'] }, tempoBpm: 72 } },
}

/** The voices can't be loaded: the holder hears it's missing and holds the options. */
export const SoundMissing: Story = { parameters: { msw: { handlers: { voices: failing('voices') } } } }

export const LongPortuguese: Story = { args: { subtitle: 'Uma cadência define o tom e, depois dela, toca o acorde perguntado' } }
