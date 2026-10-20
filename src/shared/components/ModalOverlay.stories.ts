import type { Meta, StoryObj } from '@storybook/vue3-vite'

import ModalOverlay from './ModalOverlay.vue'

const meta = {
  title: 'Overlays/ModalOverlay',
  component: ModalOverlay,
  // The panel has no surface of its own; callers give it one.
  args: { open: true, panelClass: 'w-[420px] max-w-[92vw] rounded-xl bg-surface-raised shadow-level2' },
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
