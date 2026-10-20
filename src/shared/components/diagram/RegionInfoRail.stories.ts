import type { Meta, StoryObj } from '@storybook/vue3-vite'

import RegionInfoRail from './RegionInfoRail.vue'

const meta = {
  title: 'Diagrams/RegionInfoRail',
  component: RegionInfoRail,
  args: {
    regions: [
      { id: 'r1', right: 180, color: null, label: 'Region 1 — the box shape around the 5th fret' },
      { id: 'r2', right: 360, color: '#1E7A4C', label: 'Region 2 — the extension towards the 8th fret' },
    ],
    width: 400,
    scrollLeft: 0,
    visibleWidth: 400,
  },
} satisfies Meta<typeof RegionInfoRail>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Open: Story = { args: { openId: 'r1' } }
