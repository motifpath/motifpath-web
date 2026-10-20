import type { Meta, StoryObj } from '@storybook/vue3-vite'

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
