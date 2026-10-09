import type { Meta, StoryObj } from '@storybook/vue3-vite'

import AppButton from './AppButton.vue'
import OverlayPanel from './OverlayPanel.vue'

const meta = {
  title: 'Overlays/OverlayPanel',
  component: OverlayPanel,
  args: { open: true, title: 'Report a problem' },
  render: (args) => ({
    components: { OverlayPanel, AppButton },
    setup: () => ({ args }),
    template: `
      <OverlayPanel v-bind="args">
        <p class="text-sm text-ink-muted">What went wrong?</p>
        <template #actions>
          <AppButton variant="tertiary">Cancel</AppButton>
          <AppButton>Send</AppButton>
        </template>
      </OverlayPanel>`,
  }),
} satisfies Meta<typeof OverlayPanel>

export default meta
type Story = StoryObj<typeof meta>

/** A sheet on Compact, a 480 px dialog on Medium and Expanded — switch the Viewport toolbar. */
export const Default: Story = {}
export const SubStep: Story = { args: { title: 'Language', back: true } }
export const LongPortuguese: Story = { args: { title: 'Relatar um problema com este exercício' } }
