import type { Meta, StoryObj } from '@storybook/vue3-vite'

import PreviewLayer from './PreviewLayer.vue'

const meta = {
  title: 'Teach/PreviewLayer',
  component: PreviewLayer,
  args: { open: true, title: 'Preview — what learners see' },
  render: (args) => ({
    components: { PreviewLayer },
    setup: () => ({ args }),
    template: '<PreviewLayer v-bind="args"><h1 class="text-2xl font-semibold text-ink">Guitar foundations</h1></PreviewLayer>',
  }),
} satisfies Meta<typeof PreviewLayer>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {}
