import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { BoardFrame } from '@/shared/utils/fretboardGeometry'

import FretboardBoard from './FretboardBoard.vue'

const OPEN_FRAME: BoardFrame = { minFret: 0, maxFret: 5, stringCount: 6, left: 26, columnGap: 88, rowGap: 44, top: 40 }

const meta = {
  title: 'Diagrams/FretboardBoard',
  component: FretboardBoard,
  args: { frame: OPEN_FRAME, tuning: ['E', 'B', 'G', 'D', 'A', 'E'] },
  render: (args) => ({
    components: { FretboardBoard },
    setup: () => ({ args }),
    template: '<svg width="520" height="300" viewBox="0 0 520 300"><FretboardBoard v-bind="args" /></svg>',
  }),
} satisfies Meta<typeof FretboardBoard>

export default meta
type Story = StoryObj<typeof meta>

export const OpenPosition: Story = {}
export const UpperFrets: Story = { args: { frame: { ...OPEN_FRAME, minFret: 9, maxFret: 13, left: 4, columnGap: 60 } } }
export const Plain: Story = { args: { plain: true } }
