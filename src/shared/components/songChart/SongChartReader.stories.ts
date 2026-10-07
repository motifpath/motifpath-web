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
    docs: { description: { component: 'A song chart with each chord over its word; a tap on a chord opens its voicing sheet.' } },
  },
} satisfies Meta<typeof SongChartReader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const LongLineOnAPhone: Story = {
  args: {
    chart: makeLearnerSongChart({
      revision_number: null,
      body: {
        type: 'doc',
        content: [
          makeSection([
            makeLyricLine(
              ['Quando olhei a terra ardendo qual fogueira de São ', makeAnchor('a1', 'G', { chordDefinitionId: 'chord-g' })],
              ['João, eu perguntei a Deus do céu, ai, por que tamanha judiação', makeAnchor('a2', 'C', { chordDefinitionId: 'chord-c' })],
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
