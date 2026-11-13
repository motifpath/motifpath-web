import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { chordDiagramHandler, chordInstrumentsHandler, chordVoicingItem } from '@/features/student/testing/chordItems'
import { failing, pending } from '@/shared/testUtils/msw/handlers'

import SessionChordVoicing from './SessionChordVoicing.vue'

const meta = {
  title: 'Practice/SessionChordVoicing',
  component: SessionChordVoicing,
  args: { item: chordVoicingItem('D') },
  parameters: { msw: { handlers: { diagram: chordDiagramHandler, instruments: chordInstrumentsHandler } } },
  render: (args) => ({
    components: { SessionChordVoicing },
    setup: () => ({ args }),
    template: '<div class="w-[342px]"><SessionChordVoicing v-bind="args" /></div>',
  }),
} satisfies Meta<typeof SessionChordVoicing>

export default meta
type Story = StoryObj<typeof meta>

/** Play a chord clean: the named box, then how it sounded. */
export const Guitar: Story = {}


export const Loading: Story = { parameters: { msw: { handlers: { diagram: pending('diagram') } } } }

/** The chord can't be drawn: it can only be skipped. */
export const Unavailable: Story = { parameters: { msw: { handlers: { diagram: failing('diagram') } } } }
