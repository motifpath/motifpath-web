import type { Meta, StoryObj } from '@storybook/vue3-vite'

import OverviewStrip from './OverviewStrip.vue'

const meta = {
  title: 'Diagrams/OverviewStrip',
  component: OverviewStrip,
  args: { contentWidth: 1200, viewWidth: 320, scrollLeft: 0, label: 'A minor pentatonic — full neck' },
  render: (args) => ({
    components: { OverviewStrip },
    setup: () => ({ args }),
    template: `<div class="w-80"><OverviewStrip v-bind="args">
      <svg viewBox="0 0 1200 240" class="block w-full"><rect width="1200" height="240" class="fill-surface-raised" /></svg>
    </OverviewStrip></div>`,
  }),
} satisfies Meta<typeof OverviewStrip>

export default meta
type Story = StoryObj<typeof meta>

/** The window at the nut. */
export const AtTheNut: Story = {}

/** Scrolled halfway along. */
export const Halfway: Story = { args: { scrollLeft: 440 } }

/** At the last fret. */
export const AtTheEnd: Story = { args: { scrollLeft: 880 } }
