import type { Meta, StoryObj } from '@storybook/vue3-vite'

import OverlayLayer from './OverlayLayer.vue'

const meta = {
  title: 'Overlays/OverlayLayer',
  component: OverlayLayer,
  args: { open: true },
  render: (args) => ({
    components: { OverlayLayer },
    setup: () => ({ args }),
    template: `
      <OverlayLayer v-bind="args">
        <div class="w-[min(30rem,calc(100vw-2rem))] rounded-xl bg-surface-raised p-5 shadow-level3">
          <p class="text-sm text-ink">Anything drawn over the page sits on this layer.</p>
        </div>
      </OverlayLayer>`,
  }),
} satisfies Meta<typeof OverlayLayer>

export default meta
type Story = StoryObj<typeof meta>

export const Centred: Story = {}
export const AlongTheBottom: Story = { args: { placement: 'bottom' } }
