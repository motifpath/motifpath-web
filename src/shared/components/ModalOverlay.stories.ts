import type { Meta, StoryObj } from '@storybook/vue3-vite'

import ModalOverlay from './ModalOverlay.vue'

const meta = {
  title: 'Overlays/ModalOverlay',
  component: ModalOverlay,
  args: { open: true },
  render: (args) => ({
    components: { ModalOverlay },
    setup: () => ({ args }),
    template:
      '<ModalOverlay v-bind="args"><div class="p-5"><h2 class="text-lg font-semibold">Pop-up</h2><p class="mt-2 text-sm text-ink-muted">Any content the panel holds.</p></div></ModalOverlay>',
  }),
} satisfies Meta<typeof ModalOverlay>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {}
