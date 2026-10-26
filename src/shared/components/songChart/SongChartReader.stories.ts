import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'

import { makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { makeAnchor, makeLearnerSongChart, makeLyricLine, makeSection } from '@/shared/testUtils/songChart'

import SongChartReader from './SongChartReader.vue'

const meta = {
  title: 'Song charts/SongChartReader',
  component: SongChartReader,
  args: {
    chart: makeLearnerSongChart({ revision_number: null }),
    instrument: makeFrettedInstrument(),
  },
  parameters: {
    docs: { description: { component: 'A song chart full screen: its details, the chords in this song, each chord over its word, the metronome and I played it.' } },
  },
} satisfies Meta<typeof SongChartReader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithTempoAndMeter: Story = {
  args: { chart: makeLearnerSongChart({ revision_number: null, tempo_bpm: 72, time_signature: { beats: 3, beat_value: 4 } }) },
  parameters: { docs: { description: { story: "The song's tempo is the metronome's target." } } },
}

export const AdminPreview: Story = {
  args: { preview: true },
  parameters: { docs: { description: { story: 'An admin previews the draft under a banner; nothing is sent.' } } },
}

export const LongLineOnAPhone: Story = {
  args: {
    chart: makeLearnerSongChart({
      revision_number: null,
      body: {
        type: 'doc',
        content: [
          makeSection([
            makeLyricLine(
              ['Amazing grace, how ', makeAnchor('a1', 'G', { chordDefinitionId: 'chord-g' })],
              ['sweet the sound that saved a wretch like me, I once was lost but now am found', makeAnchor('a2', 'C', { chordDefinitionId: 'chord-c' })],
            ),
          ]),
        ],
      },
    }),
  },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
}

export const WithProgressions: Story = {
  args: {
    chart: makeLearnerSongChart({
      revision_number: null,
      body: {
        type: 'doc',
        content: [
          makeSection([makeLyricLine(['Amazing grace, how ', makeAnchor('a1', 'G', { chordDefinitionId: 'chord-g' })], ['sweet the sound', makeAnchor('a2', 'C', { chordDefinitionId: 'chord-c' })])], {
            label: 'Verse 1',
            progression_keys: ['I-IV-I-V'],
          }),
          makeSection([makeLyricLine(['I once was lost, ', makeAnchor('a3', 'G', { chordDefinitionId: 'chord-g' })], ['but now am found', makeAnchor('a4', 'C', { chordDefinitionId: 'chord-c' })])], {
            label: 'Verse 2',
            progression_keys: ['I-IV-I-V'],
          }),
          makeSection([makeLyricLine(['Was blind, but now ', makeAnchor('a5', 'C', { chordDefinitionId: 'chord-c' })], ['I see', makeAnchor('a6', 'G', { chordDefinitionId: 'chord-g' })])], {
            kind: 'chorus',
            progression_keys: ['ii-V-I'],
          }),
        ],
      },
    }),
  },
  play: async ({ canvas }) => {
    // The overview lists I–IV–I–V once; each verse shows it beside its heading.
    await expect(await canvas.findAllByText('I–IV–I–V')).toHaveLength(3)
    await expect(canvas.getByRole('region', { name: 'Progressions in this song' })).toHaveTextContent(/I–IV–I–V\s*ii–V–I/)
  },
  parameters: { docs: { description: { story: 'Under the chords, each progression the song plays once; each section shows its own beside its heading.' } } },
}

export const NoChordAndUnresolved: Story = {
  args: {
    chart: makeLearnerSongChart({
      revision_number: null,
      body: {
        type: 'doc',
        content: [makeSection([makeLyricLine(['Intro', makeAnchor('a1', 'N.C.')], ['la la', makeAnchor('a2', 'H7')])])],
      },
    }),
  },
  parameters: { docs: { description: { story: 'A no-chord marking and a symbol that resolved to no chord are plain text.' } } },
}
